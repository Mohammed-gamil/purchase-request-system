import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/stores/authStore";
import RoleGuard from "@/components/auth/RoleGuard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Stepper } from "@/components/ui/stepper";
import { 
  ArrowLeft, 
  FileText, 
  Clock, 
  User, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Download,
  Eye,
  Plus,
  Calendar,
  Building,
  MessageSquare
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ar as arSA } from "date-fns/locale";
import { Request, PayoutChannel, UserRole } from "@/types";
import { requestService } from "@/lib/requestsApi";
import { approvalsApi, requestsApi } from "@/lib/api";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/use-translation";

// Backend-driven request state

const approvalSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  comment: z.string().optional(),
  payoutChannel: z.enum(["WALLET", "COMPANY", "COURIER"]).optional(),
  quoteId: z.number().optional(),
}).refine((data) => data.decision !== 'REJECTED' || (data.comment && data.comment.trim().length > 0), {
  message: 'prDetails.commentRequired',
  path: ['comment']
});

const fundsTransferSchema = z.object({
  payoutReference: z.string().min(1, "prDetails.payoutReferenceRequired"),
  transferredAt: z.date(),
});

const quoteUploadSchema = z.object({
  vendorName: z.string().min(1, "prDetails.vendorNameRequired"),
  quoteTotal: z.number().positive("prDetails.quoteTotalPositive"),
  quoteUrl: z.string().url("prDetails.quoteUrlInvalid"),
});

type ApprovalFormData = z.infer<typeof approvalSchema>;
type FundsTransferFormData = z.infer<typeof fundsTransferSchema>;
type QuoteUploadFormData = z.infer<typeof quoteUploadSchema>;

const stateSteps = [
  'prDetails.stepDraft',
  'prDetails.stepSubmitted',
  'prDetails.stepManagerApproved',
  'prDetails.stepAccountantApproved',
  'prDetails.stepFinalApproved',
  'prDetails.stepFundsTransferred',
];
const rejectedStates = ["DM_REJECTED", "ACCT_REJECTED", "FINAL_REJECTED"];

export default function PRDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [pr, setPr] = useState<Request | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showFundsDialog, setShowFundsDialog] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [quoteErrors, setQuoteErrors] = useState<string[]>([]);
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [showQuotePreview, setShowQuotePreview] = useState(false);
  const [quotePreview, setQuotePreview] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await requestService.getRequest(id);
        if (!cancelled) setPr(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load request');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const approvalForm = useForm<ApprovalFormData>({
    resolver: zodResolver(approvalSchema),
    defaultValues: {
      decision: "APPROVED",
      comment: "",
    },
  });

  const fundsForm = useForm<FundsTransferFormData>({
    resolver: zodResolver(fundsTransferSchema),
    defaultValues: {
      payoutReference: "",
      transferredAt: new Date(),
    },
  });
  
  const quoteForm = useForm<QuoteUploadFormData>({
    resolver: zodResolver(quoteUploadSchema),
    defaultValues: {
      vendorName: "",
      quoteTotal: 0,
      quoteUrl: "",
    },
  });

  const getStateColor = (state: string) => {
    if (rejectedStates.includes(state)) return 'bg-destructive/10 text-destructive';
    switch (state) {
      case 'DRAFT': return 'bg-muted text-foreground';
      case 'SUBMITTED': return 'bg-primary/10 text-primary';
      case 'DM_APPROVED': return 'bg-success/10 text-success';
      case 'ACCT_APPROVED': return 'bg-accent/20 text-foreground';
      case 'FINAL_APPROVED': return 'bg-success/10 text-success';
      case 'FUNDS_TRANSFERRED': return 'bg-warning/20 text-warning-foreground';
      default: return 'bg-muted text-foreground';
    }
  };

  const getCurrentStepIndex = (state: string) => {
    switch (state) {
      case 'DRAFT': return 0;
      case 'SUBMITTED': return 1;
      case 'DM_APPROVED': return 2;
      case 'ACCT_APPROVED': return 3;
      case 'FINAL_APPROVED': return 4;
      case 'FUNDS_TRANSFERRED': return 5;
      default: return 1;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const locale = language === 'ar' ? 'ar-EG' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const canApprove = () => {
    if (!user || !pr) return false;
    const state = (pr as any)?.state;
    // Allow pooled approvers to act based on stage
    if (user.role === 'DIRECT_MANAGER' && state === 'SUBMITTED') return true;
    if (user.role === 'ACCOUNTANT' && state === 'DM_APPROVED') return true;
    // Fallback: if specifically assigned
    return (pr as any)?.current_approver_id === user.id || (pr as any)?.currentApproverId === user.id;
  };

  const canMarkFundsTransferred = () => {
    if (!user) return false;
    const state = (pr as any)?.state;
    return user.role === 'ACCOUNTANT' && state === 'FINAL_APPROVED';
  };

  const handleApproval = async (data: ApprovalFormData) => {
    if (!id) return;
    // UI guard: Accountants must select a quote before final approval
    const state = String((pr as any)?.state ?? "");
    const hasSelectedQuote = Boolean((pr as any)?.selectedQuote?.id || (pr as any)?.selected_quote?.id || (pr as any)?.selected_quote_id);
    try {
      setLoading(true);
      // If accountant is approving at DM_APPROVED stage and no selected quote yet,
      // attempt to select the quote provided in the approval form
      if (user?.role === 'ACCOUNTANT' && state === 'DM_APPROVED' && data.decision === 'APPROVED' && !hasSelectedQuote) {
        const chosenId = data.quoteId;
        if (!chosenId) {
          toast.error(t('prDetails.mustSelectQuoteBeforeApproval' as any) || 'Please select a quote before final approval');
          setLoading(false);
          return;
        }
        try {
          await approvalsApi.selectQuote(id, { quote_id: Number(chosenId) });
        } catch (selErr: any) {
          const status = selErr?.response?.status;
          if (status === 409) {
            toast.error(t('common.error') + ': ' + (selErr?.response?.data?.error?.message || 'Already processed by another approver'));
          } else {
            const msg = selErr?.response?.data?.error?.message || selErr?.message || t('common.errorOccurred' as any);
            toast.error(String(msg));
          }
          // Refresh and stop approval on selection error
          try {
            const refreshed = await requestService.getRequest(id);
            setPr(refreshed);
          } catch {}
          setLoading(false);
          return;
        }
      }
      const finalDecision = user?.role === 'ACCOUNTANT' ? 'APPROVED' : data.decision;
      if (finalDecision === 'APPROVED') {
        await approvalsApi.approveRequest(id, {
          comment: data.comment || undefined,
          payout_channel: user?.role === 'ACCOUNTANT' ? (data.payoutChannel as any) : undefined,
        });
        toast.success(t('prDetails.toast.approvalSuccess'));
      } else {
        await approvalsApi.rejectRequest(id, { comment: String(data.comment || '') });
        toast.success(t('prDetails.toast.rejectionSuccess' as any));
      }
      const refreshed = await requestService.getRequest(id);
      setPr(refreshed);
      setShowApprovalDialog(false);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 409) {
        toast.error(t('common.error') + ': ' + (error?.response?.data?.error?.message || 'Already processed by another approver'));
        try {
          const refreshed = await requestService.getRequest(id);
          setPr(refreshed);
        } catch {}
      } else {
        const msg = error?.response?.data?.error?.message || error?.message || t('prDetails.toast.approvalError');
        toast.error(String(msg));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFundsTransfer = async (data: FundsTransferFormData) => {
    if (!id) return;
    try {
      setLoading(true);
      await approvalsApi.transferFunds(id, { payout_reference: data.payoutReference });
      toast.success(t('prDetails.toast.fundsSuccess'));
      const refreshed = await requestService.getRequest(id);
      setPr(refreshed);
      setShowFundsDialog(false);
    } catch (error: any) {
      const msg = error?.response?.data?.error?.message || error?.message || t('prDetails.toast.fundsError');
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const getQuoteUrl = (quote: any): string => {
    return String(quote.filePath ?? quote.file_path ?? quote.url ?? quote.file_url ?? '');
  };

  const viewQuote = (quote: any) => {
    const url = getQuoteUrl(quote);
    if (!url) {
      toast.error(String((t('prDetails.noQuoteUrl' as any) || 'No quote URL available')));
      return;
    }
    setQuotePreview(quote);
    setShowQuotePreview(true);
  };

  const downloadQuote = (quote: any) => {
    const url = getQuoteUrl(quote);
    if (!url) {
      toast.error(String((t('prDetails.noQuoteUrl' as any) || 'No quote URL available')));
      return;
    }
    try {
      const a = document.createElement('a');
      a.href = url;
      let filename = 'quote';
      try {
        const u = new URL(url);
        const last = u.pathname.split('/').filter(Boolean).pop();
        if (last) filename = last;
      } catch {}
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if ((t as any)('prDetails.toast.downloadingQuote')) {
        toast.success((t as any)('prDetails.toast.downloadingQuote').replace('{vendor}', String(quote.vendorName ?? quote.vendor_name ?? '')));
      }
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const isAccountantStage = () => {
    return user?.role === 'ACCOUNTANT' && String((pr as any)?.state) === 'DM_APPROVED';
  };

  const selectLowestQuote = async () => {
    if (!id) return;
    try {
      setLoading(true);
  await approvalsApi.selectQuote(id, { auto_lowest: true });
  toast.success(t('prDetails.toast.lowestQuoteSelected' as any));
      const refreshed = await requestService.getRequest(id);
      setPr(refreshed);
    } catch (error: any) {
  const msg = error?.response?.data?.error?.message || error?.message || t('common.errorOccurred' as any);
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const selectQuote = async (quoteId: number) => {
    if (!id) return;
    try {
      setLoading(true);
  await approvalsApi.selectQuote(id, { quote_id: quoteId });
  toast.success(t('prDetails.toast.quoteSelected' as any));
      const refreshed = await requestService.getRequest(id);
      setPr(refreshed);
    } catch (error: any) {
  const msg = error?.response?.data?.error?.message || error?.message || t('common.errorOccurred' as any);
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };
  
  const handleQuoteUpload = async (data: QuoteUploadFormData) => {
    try {
      if (!id) return;
      setLoading(true);
      setQuoteErrors([]);
      await requestsApi.uploadQuoteUrl(id, {
        vendor_name: data.vendorName,
        quote_total: data.quoteTotal,
        file_url: data.quoteUrl.trim(),
      });
      toast.success(t('prDetails.toast.quoteUploadSuccess').replace('{vendor}', data.vendorName));

      const refreshed = await requestService.getRequest(id);
      setPr(refreshed);

      quoteForm.reset();
      setShowQuoteDialog(false);
    } catch (error: any) {
      console.log('Error in handleQuoteUpload:', error);
      console.log('Status:', error?.response?.status);
      console.log('Data:', error?.response?.data);
      // If validation error from backend, surface messages inline in dialog
      const status = error?.response?.status;
      if (status === 422) {
        const details = error?.response?.data?.error?.details;
        if (Array.isArray(details) && details.length > 0) {
          setQuoteErrors(details.map((d: any) => String(d)));
        } else {
          const msg = error?.response?.data?.error?.message || error?.message || t('common.errorOccurred' as any);
          setQuoteErrors([String(msg)]);
        }
      } else {
        const msg = error?.response?.data?.error?.message || error?.message || t('common.errorOccurred' as any);
        toast.error(String(msg));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {loading && <div className="text-sm text-muted-foreground">{t('common.loading')}</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {!loading && !error && pr && (
        <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/prs")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('prDetails.backToPRs')}
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{String((pr as any).title)}</h1>
              <Badge className={getStateColor(String((pr as any).state))}>
                {t((`status.${(pr as any).state}`) as any)}
              </Badge>
            </div>
            <p className="text-gray-600 mt-1">{t('prDetails.prNumber')}{String((pr as any).request_id ?? (pr as any).id)}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <RoleGuard allowedRoles={['DIRECT_MANAGER', 'ACCOUNTANT', 'FINAL_MANAGER']}>
            {canApprove() && (
              <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t('prDetails.review')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('prDetails.reviewDialogTitle')}</DialogTitle>
                    <DialogDescription>
                      {t('prDetails.reviewDialogDescription')}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={approvalForm.handleSubmit(handleApproval)} className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('prDetails.decision')}</Label>
                      <Select onValueChange={(value: "APPROVED" | "REJECTED") => approvalForm.setValue("decision", value)} value={approvalForm.watch('decision')}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('prDetails.selectDecision')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="APPROVED">{t('prDetails.approve')}</SelectItem>
                          {user?.role !== 'ACCOUNTANT' && (
                            <SelectItem value="REJECTED">{t('prDetails.reject')}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {user?.role === 'ACCOUNTANT' && approvalForm.watch("decision") === "APPROVED" && (
                      <div className="space-y-2">
                        <Label>{t('prDetails.payoutChannel')}</Label>
                        <Select onValueChange={(value: PayoutChannel) => approvalForm.setValue("payoutChannel", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('prDetails.selectPayoutChannel')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="WALLET">{t('prDetails.payoutWallet')}</SelectItem>
                            <SelectItem value="COMPANY">{t('prDetails.payoutCompany')}</SelectItem>
                            <SelectItem value="COURIER">{t('prDetails.payoutCourier')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {user?.role !== 'ACCOUNTANT' && (
                      <div className="space-y-2">
                        <Label>{approvalForm.watch("decision") === "REJECTED" ? t('prDetails.commentRequired') : t('prDetails.comment')}</Label>
                        <Textarea
                          placeholder={t('prDetails.commentPlaceholder')}
                          {...approvalForm.register("comment")}
                        />
                      </div>
                    )}

                    {/* Accountant quote selection during review when none selected yet */}
                    {user?.role === 'ACCOUNTANT' && approvalForm.watch("decision") === "APPROVED" && String((pr as any)?.state) === 'DM_APPROVED' && !Boolean((pr as any)?.selectedQuote?.id || (pr as any)?.selected_quote?.id || (pr as any)?.selected_quote_id) && (
                      <div className="space-y-2">
                        <Label>{t('prDetails.selectQuote' as any) || 'Select a quote to continue'}</Label>
                        <Select onValueChange={(value) => approvalForm.setValue('quoteId', Number(value))}>
                          <SelectTrigger>
                            <SelectValue placeholder={t('prDetails.selectQuotePlaceholder' as any) || 'Choose a quote'} />
                          </SelectTrigger>
                          <SelectContent>
                            {((pr as any)?.quotes ?? []).map((q: any) => {
                              const vendor = String(q.vendorName ?? q.vendor_name ?? 'Vendor');
                              const total = Number(q.quoteTotal ?? q.quote_total ?? 0);
                              return (
                                <SelectItem key={q.id} value={String(q.id)}>
                                  {vendor} — {formatCurrency(total, String((pr as any).currency ?? 'USD'))}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowApprovalDialog(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button type="submit" disabled={user?.role === 'ACCOUNTANT' && approvalForm.watch("decision") === "APPROVED" && String((pr as any)?.state) === 'DM_APPROVED' && !Boolean((pr as any)?.selectedQuote?.id || (pr as any)?.selected_quote?.id || (pr as any)?.selected_quote_id || approvalForm.watch('quoteId'))}>
                        {t('prDetails.submitDecision')}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </RoleGuard>

          <RoleGuard allowedRoles={['ACCOUNTANT']}>
            {canMarkFundsTransferred() && (
              <Dialog open={showFundsDialog} onOpenChange={setShowFundsDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <DollarSign className="h-4 w-4 mr-2" />
                    {t('prDetails.markFundsTransferred')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('prDetails.fundsDialogTitle')}</DialogTitle>
                    <DialogDescription>
                      {t('prDetails.fundsDialogDescription')}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={fundsForm.handleSubmit(handleFundsTransfer)} className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('prDetails.payoutReference')}</Label>
                      <input
                        type="text"
                        placeholder={t('prDetails.payoutReferencePlaceholder')}
                        {...fundsForm.register("payoutReference")}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t('prDetails.transferDate')}</Label>
                      <input
                        type="date"
                        {...fundsForm.register("transferredAt", { valueAsDate: true })}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowFundsDialog(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button type="submit">
                        {t('prDetails.markAsTransferred')}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </RoleGuard>
        </div>
      </div>

      {/* Status Stepper */}
      <Card>
        <CardContent className="pt-6">
          <Stepper 
            steps={stateSteps.map((k) => t(k as any))} 
            currentStep={getCurrentStepIndex(String((pr as any).state))}
            completeCurrent={['SUBMITTED','DM_APPROVED','ACCT_APPROVED','FINAL_APPROVED','FUNDS_TRANSFERRED'].includes(String((pr as any)?.state))}
          />
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Details */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">{t('prDetails.tabOverview')}</TabsTrigger>
              <TabsTrigger value="items">{t('prDetails.tabItems')}</TabsTrigger>
              <TabsTrigger value="quotes">{t('prDetails.tabQuotes')}</TabsTrigger>
              <TabsTrigger value="approvals">{t('prDetails.tabApprovals')}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('prDetails.requestDetails')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">{t('prDetails.category')}</h4>
                      <p>{String((pr as any).category ?? '')}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">{t('prDetails.estimatedCost')}</h4>
                      <p className="text-lg font-semibold">
                        {formatCurrency(Number((pr as any).desired_cost ?? (pr as any).desiredCost ?? 0), String((pr as any).currency ?? 'USD'))}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">{t('prDetails.neededBy')}</h4>
                      <p>{format(new Date((pr as any).needed_by_date ?? (pr as any).neededByDate), "PPP", { locale: language === 'ar' ? arSA : undefined })}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground">{t('prDetails.created')}</h4>
                      <p>{formatDistanceToNow(new Date((pr as any).created_at ?? (pr as any).createdAt), { addSuffix: true, locale: language === 'ar' ? arSA : undefined })}</p>
                    </div>
                  </div>

                  {(pr as any).description && (
                    <div>
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">{t('prDetails.description')}</h4>
                      <p className="text-foreground/80">{String((pr as any).description)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="items" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('prDetails.itemsCount').replace('{count}', String(((pr as any)?.items?.length ?? 0)))}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {((pr as any)?.items ?? []).map((item: any) => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{item.name}</h4>
                          <span className="font-semibold">
                            {formatCurrency(Number(item.total ?? (item.quantity * ((item.unit_price ?? item.unitPrice) || 0))), String((pr as any).currency ?? 'USD'))}
                          </span>
                        </div>
                        <div className="grid gap-2 md:grid-cols-3 text-sm text-muted-foreground">
                          <div>{t('prDetails.quantity')}: {item.quantity}</div>
                          <div>{t('prDetails.unitPrice')}: {formatCurrency(Number(item.unit_price ?? item.unitPrice), String((pr as any).currency ?? 'USD'))}</div>
                          {item.vendorHint && <div>{t('prDetails.vendorHint')}: {item.vendorHint}</div>}
                        </div>
                      </div>
                    ))}
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center font-bold">
                        <span>{t('prDetails.total')}</span>
                        <span>{formatCurrency(((pr as any)?.items ?? []).reduce((sum: number, item: any) => sum + Number(item.total ?? (item.quantity * ((item.unit_price ?? item.unitPrice) || 0))), 0), String((pr as any).currency ?? 'USD'))}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quotes" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('prDetails.quotesCount').replace('{count}', String(((pr as any)?.quotes?.length ?? 0)))}</CardTitle>
                  <RoleGuard allowedRoles={['ACCOUNTANT', 'ADMIN']}>
                    <Button size="sm" onClick={() => setShowQuoteDialog(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      {t('prDetails.uploadQuote')}
                    </Button>
                  </RoleGuard>
                </CardHeader>
                <CardContent>
                  {(((pr as any)?.quotes?.length ?? 0) > 0) ? (
                    <div className="space-y-4">
                      {((pr as any)?.quotes ?? []).sort((a: any, b: any) => Number(a.quoteTotal ?? a.quote_total) - Number(b.quoteTotal ?? b.quote_total)).map((quote: any, idx: number, arr: any[]) => {
                        const isSelected = (pr as any)?.selectedQuote?.id === quote.id;
                        const isLowest = idx === 0;
                        const total = Number(quote.quoteTotal ?? quote.quote_total);
                        const uploadedAt = new Date(quote.uploadedAt ?? quote.uploaded_at ?? Date.now());
                        return (
                        <div key={quote.id} className={`flex items-center justify-between p-4 border rounded-lg ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                          <div>
                            <h4 className="font-medium flex items-center gap-2">
                              {String(quote.vendorName ?? quote.vendor_name)}
                              {isSelected && <Badge className="bg-emerald-100 text-emerald-800">{t('prDetails.selected' as any)}</Badge>}
                              {isLowest && <Badge variant="outline" className="text-xs">{t('prDetails.lowest' as any)}</Badge>}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {t('prDetails.total')}: {formatCurrency(total, String((pr as any).currency ?? 'USD'))}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t('prDetails.uploaded')} {formatDistanceToNow(uploadedAt, { addSuffix: true, locale: language === 'ar' ? arSA : undefined })}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => viewQuote(quote)}>
                              <Eye className="h-4 w-4 mr-1" />
                              {t('prDetails.view')}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => downloadQuote(quote)}>
                              <Download className="h-4 w-4 mr-1" />
                              {t('prDetails.download')}
                            </Button>
                            {isAccountantStage() && !isSelected && (
                              <Button size="sm" onClick={() => selectQuote(Number(quote.id))}>
                                {t('prDetails.selectThisQuote' as any)}
                              </Button>
                            )}
                          </div>
                        </div>
                      )})}
                      {isAccountantStage() && (
                        <div className="pt-2">
                          <Button variant="outline" onClick={selectLowestQuote}>{t('prDetails.selectLowestQuote' as any)}</Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-muted-foreground text-center py-4">{t('prDetails.noQuotes')}</p>
                      <RoleGuard allowedRoles={['ACCOUNTANT', 'ADMIN']}>
                        <div className="flex justify-center py-4">
                          <Button variant="outline" onClick={() => setShowQuoteDialog(true)}>
                            <Plus className="h-4 w-4 mr-1" />
                            {t('prDetails.uploadQuote')}
                          </Button>
                        </div>
                      </RoleGuard>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="approvals" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('prDetails.approvalHistory')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(((pr as any)?.approvals ?? []) as any[]).map((approval: any) => (
                      <div key={approval.id} className="flex items-start gap-3 p-4 border rounded-lg">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={approval.approver?.avatar} />
                          <AvatarFallback>
                            {String(approval.approver?.name ?? '') .split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{approval.approver?.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {t('prDetails.stageApproval').replace('{stage}', t((`prDetails.stage.${approval.stage}`) as any))}
                            </Badge>
                            <Badge
                              className={
                                approval.decision === 'APPROVED' ? 'bg-success/10 text-success' :
                                approval.decision === 'REJECTED' ? 'bg-destructive/10 text-destructive' :
                                'bg-warning/20 text-warning-foreground'
                              }
                            >
                              {t((`status.${approval.decision}`) as any)}
                            </Badge>
                          </div>
                          {approval.comment && (
                            <p className="text-sm text-muted-foreground mb-2">{approval.comment}</p>
                          )}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {(approval.decidedAt || approval.decided_at)
                              ? `${t('prDetails.decided')} ${formatDistanceToNow(new Date(approval.decidedAt ?? approval.decided_at), { addSuffix: true, locale: language === 'ar' ? arSA : undefined })}`
                              : `${t('prDetails.pendingSince')} ${formatDistanceToNow(new Date(approval.createdAt ?? approval.created_at), { addSuffix: true, locale: language === 'ar' ? arSA : undefined })}`
                            }
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Requester Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('prDetails.requester')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={(pr as any)?.requester?.avatar} />
                  <AvatarFallback>
                    {String((pr as any)?.requester?.name ?? 'PR').split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{String((pr as any)?.requester?.name ?? '')}</p>
                  <p className="text-sm text-muted-foreground">{String((pr as any)?.requester?.email ?? '')}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {t((`roles.${String((pr as any)?.requester?.role ?? 'USER')}`) as any)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Approver */}
          {(pr as any)?.currentApprover && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  {t('prDetails.currentApprover')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={(pr as any).currentApprover.avatar} />
                    <AvatarFallback>
                      {String((pr as any).currentApprover.name).split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{String((pr as any).currentApprover.name)}</p>
                    <p className="text-sm text-muted-foreground">{String((pr as any).currentApprover.email)}</p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {t((`roles.${String((pr as any).currentApprover.role)}`) as any)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>{t('prDetails.quickActions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                {t('prDetails.exportPdf')}
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="mr-2 h-4 w-4" />
                {t('prDetails.addComment')}
              </Button>
              <RoleGuard allowedRoles={['USER']}>
                {String((pr as any).state) === 'DRAFT' && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href={`/prs/${String((pr as any).id)}/edit`}>
                      <FileText className="mr-2 h-4 w-4" />
                      {t('prDetails.editRequest')}
                    </a>
                  </Button>
                )}
              </RoleGuard>
            </CardContent>
          </Card>
        </div>
      </div>
      
  {/* Upload Quote Dialog */}
      <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('prDetails.uploadQuoteDialogTitle')}</DialogTitle>
            <DialogDescription>
              {t('prDetails.uploadQuoteDialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={quoteForm.handleSubmit(handleQuoteUpload)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vendorName">{t('prDetails.vendorName')}</Label>
              <Input
                id="vendorName"
                placeholder={t('prDetails.vendorNamePlaceholder')}
                {...quoteForm.register("vendorName")}
                onChange={() => { if (quoteErrors.length) setQuoteErrors([]); }}
              />
              {quoteForm.formState.errors.vendorName && (
                <p className="text-sm text-red-500">{quoteForm.formState.errors.vendorName?.message as any}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quoteTotal">{t('prDetails.quoteTotal')}</Label>
              <Input
                id="quoteTotal"
                type="number"
                step="0.01"
                {...quoteForm.register("quoteTotal", { valueAsNumber: true })}
                onChange={() => { if (quoteErrors.length) setQuoteErrors([]); }}
              />
              {quoteForm.formState.errors.quoteTotal && (
                <p className="text-sm text-red-500">{quoteForm.formState.errors.quoteTotal?.message as any}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quoteUrl">{t('prDetails.quoteUrl' as any) || 'Quote URL'}</Label>
              <Input
                id="quoteUrl"
                type="url"
                placeholder="https://example.com/quote.pdf"
                {...quoteForm.register('quoteUrl')}
                onChange={() => { if (quoteErrors.length) setQuoteErrors([]); }}
              />
              {quoteErrors.length > 0 && (
                <div className="space-y-1 mt-2">
                  {quoteErrors.map((err, i) => (
                    <p key={i} className="text-sm text-red-500">{err}</p>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {t('prDetails.quoteUrlHelp' as any) || 'Provide a direct URL to the quote file.'}
              </p>
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowQuoteDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {t('prDetails.submitQuote')}
              </Button>
            </div>
          </form>
        </DialogContent>
  </Dialog>

  {/* Quote Preview Dialog */}
  <Dialog open={showQuotePreview} onOpenChange={setShowQuotePreview}>
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>
          {String(quotePreview?.vendorName ?? quotePreview?.vendor_name ?? (t('prDetails.view' as any)) ?? 'Quote Preview')}
        </DialogTitle>
        <DialogDescription>
          {t('prDetails.total')}: {quotePreview ? formatCurrency(Number(quotePreview.quoteTotal ?? quotePreview.quote_total ?? 0), String((pr as any)?.currency ?? 'USD')) : ''}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        {quotePreview ? (
          <>
            <div className="rounded border bg-secondary p-2 text-xs text-muted-foreground">
              <div>{t('prDetails.vendorName')}: {String(quotePreview.vendorName ?? quotePreview.vendor_name)}</div>
              <div>{t('prDetails.total')}: {formatCurrency(Number(quotePreview.quoteTotal ?? quotePreview.quote_total ?? 0), String((pr as any)?.currency ?? 'USD'))}</div>
            </div>
            <div className="w-full max-h-[70vh] overflow-auto">
              {(() => {
                const url = getQuoteUrl(quotePreview);
                return url ? (
                  <img
                    src={url}
                    alt={String(quotePreview.vendorName ?? quotePreview.vendor_name)}
                    className="w-full h-auto object-contain rounded border"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                      toast.error(String(t('prDetails.imageLoadFailed' as any) || 'Failed to load image'));
                    }}
                  />
                ) : (
                  <div className="text-sm text-muted-foreground">{String(t('prDetails.noQuoteUrl' as any) || 'No quote URL available')}</div>
                );
              })()}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { const url = getQuoteUrl(quotePreview); if (url) window.open(url, '_blank', 'noopener,noreferrer'); }}>
                {t('prDetails.openInNewTab' as any) || 'Open in new tab'}
              </Button>
              <Button onClick={() => quotePreview && downloadQuote(quotePreview)}>
                {t('prDetails.download')}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </DialogContent>
  </Dialog>
  </>
  )}
    </div>
  );
}
