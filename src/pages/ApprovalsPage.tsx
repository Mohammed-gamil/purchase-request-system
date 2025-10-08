import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  DollarSign, 
  FileText,
  User,
  Calendar,
  AlertTriangle,
  Loader2,
  Eye,
  MessageSquare,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { Request, PayoutChannel } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { requestsApi } from "@/lib/api";
import { approvalsService } from "@/lib/approvalsApi";
import toast from "react-hot-toast";
import { useTranslation } from "@/hooks/use-translation";

export default function ApprovalsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [pendingRequests, setPendingRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [isFundsDialogOpen, setIsFundsDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [rejectionComment, setRejectionComment] = useState("");
  const [payoutChannel, setPayoutChannel] = useState<PayoutChannel>("COMPANY");
  const [payoutReference, setPayoutReference] = useState("");

  // Fetch pending approvals on component mount
  useEffect(() => {
    const fetchPendingApprovals = async () => {
      try {
        setIsLoading(true);
        const response = await requestsApi.getPendingApprovals({ per_page: 20 });
        setPendingRequests(response.data || []);
      } catch (error) {
        console.error('Failed to fetch pending approvals:', error);
        toast.error('Failed to fetch pending approvals');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchPendingApprovals();
    }
  }, [user]);

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      setIsProcessing(true);
      await approvalsService.approveRequest(selectedRequest.id.toString(), {
        comment: approvalComment,
        payoutChannel,
      });
      
      toast.success('Request approved successfully');
      setIsApprovalDialogOpen(false);
      setApprovalComment("");
      
      // Refresh pending requests
      const response = await requestsApi.getPendingApprovals({ per_page: 20 });
      setPendingRequests(response.data || []);
    } catch (error) {
      console.error('Failed to approve request:', error);
      toast.error('Failed to approve request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionComment.trim()) {
      toast.error('Comment is required for rejection');
      return;
    }

    try {
      setIsProcessing(true);
      await approvalsService.rejectRequest(selectedRequest.id.toString(), rejectionComment);
      
      toast.success('Request rejected');
      setIsRejectionDialogOpen(false);
      setRejectionComment("");
      
      // Refresh pending requests
      const response = await requestsApi.getPendingApprovals({ per_page: 20 });
      setPendingRequests(response.data || []);
    } catch (error) {
      console.error('Failed to reject request:', error);
      toast.error('Failed to reject request');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransferFunds = async () => {
    if (!selectedRequest || !payoutReference.trim()) {
      toast.error('Payout reference is required');
      return;
    }

    try {
      setIsProcessing(true);
      await approvalsService.transferFunds(selectedRequest.id.toString(), payoutReference);
      
      toast.success('Funds transferred successfully');
      setIsFundsDialogOpen(false);
      setPayoutReference("");
      
      // Refresh pending requests
      const response = await requestsApi.getPendingApprovals({ per_page: 20 });
      setPendingRequests(response.data || []);
    } catch (error) {
      console.error('Failed to transfer funds:', error);
      toast.error('Failed to transfer funds');
    } finally {
      setIsProcessing(false);
    }
  };

  const openApprovalDialog = (request: Request) => {
    setSelectedRequest(request);
    setIsApprovalDialogOpen(true);
  };

  const openRejectionDialog = (request: Request) => {
    setSelectedRequest(request);
    setIsRejectionDialogOpen(true);
  };

  const openFundsDialog = (request: Request) => {
    setSelectedRequest(request);
    setIsFundsDialogOpen(true);
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'SUBMITTED': return 'bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200';
      case 'DM_APPROVED': return 'bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-200';
      case 'ACCT_APPROVED': return 'bg-purple-100 dark:bg-purple-800/50 text-purple-800 dark:text-purple-200';
      case 'FINAL_APPROVED': return 'bg-emerald-100 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100';
    }
  };

  const getRequestTypeColor = (type: string) => {
    switch (type) {
      case 'purchase': return 'bg-indigo-100 dark:bg-indigo-800/50 text-indigo-800 dark:text-indigo-200';
      case 'project': return 'bg-amber-100 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const canApprove = (request: Request): boolean => {
    if (!user) return false;
    return approvalsService.canApprove(request.state, user.role);
  };

  const canTransferFunds = (request: Request): boolean => {
    if (!user) return false;
    return approvalsService.canTransferFunds(request.state, user.role);
  };

  const getNextStage = (request: Request): string | null => {
    return approvalsService.getNextApprovalStage(request.state);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('approvals.title')}</h1>
          <p className="text-muted-foreground">
            {t('approvals.subtitle')}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground">
              Requires your attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                pendingRequests.reduce((sum, req) => sum + req.desired_cost, 0),
                'USD'
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Total pending value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purchase Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingRequests.filter(req => req.type === 'purchase').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Purchase requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingRequests.filter(req => req.type === 'project').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Project requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>
            Review and approve pending requests based on your role
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading pending requests...</span>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>No pending approvals</p>
              <p className="text-sm">All caught up!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{request.title}</h3>
                        <Badge className={getStateColor(request.state)}>
                          {request.state.replace('_', ' ')}
                        </Badge>
                        <Badge className={getRequestTypeColor(request.type)}>
                          {request.type}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4">
                        {request.description}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {formatCurrency(request.desired_cost, request.currency)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{request.requester?.name}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            Due: {format(new Date(request.needed_by_date), "MMM dd, yyyy")}
                          </span>
                        </div>
                      </div>

                      {getNextStage(request) && (
                        <div className="flex items-center gap-2 mb-4">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          <span className="text-sm text-amber-700 dark:text-amber-300">
                            Next: {getNextStage(request)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/prs/${request.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </Button>

                      {canApprove(request) && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => openApprovalDialog(request)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => openRejectionDialog(request)}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </>
                      )}

                      {canTransferFunds(request) && (
                        <Button
                          size="sm"
                          onClick={() => openFundsDialog(request)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <ArrowRight className="mr-2 h-4 w-4" />
                          Transfer Funds
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              You are about to approve "{selectedRequest?.title}". This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approval-comment">Comment (Optional)</Label>
              <Textarea
                id="approval-comment"
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder="Add any comments about this approval..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payout-channel">Payout Channel</Label>
              <Select value={payoutChannel} onValueChange={(value: PayoutChannel) => setPayoutChannel(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPANY">Company Account</SelectItem>
                  <SelectItem value="WALLET">Digital Wallet</SelectItem>
                  <SelectItem value="COURIER">Cash on Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              You are about to reject "{selectedRequest?.title}". Please provide a reason for rejection.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-comment">Reason for Rejection *</Label>
              <Textarea
                id="rejection-comment"
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                placeholder="Please provide a clear reason for rejecting this request..."
                rows={4}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectionDialogOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleReject} disabled={isProcessing || !rejectionComment.trim()} variant="destructive">
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Funds Transfer Dialog */}
      <Dialog open={isFundsDialogOpen} onOpenChange={setIsFundsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Funds</DialogTitle>
            <DialogDescription>
              Mark funds as transferred for "{selectedRequest?.title}". This is the final step in the approval process.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payout-reference">Payout Reference *</Label>
              <Input
                id="payout-reference"
                value={payoutReference}
                onChange={(e) => setPayoutReference(e.target.value)}
                placeholder="TXN-2025-001234"
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the transaction reference or payment ID
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFundsDialogOpen(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleTransferFunds} disabled={isProcessing || !payoutReference.trim()} className="bg-blue-600 hover:bg-blue-700">
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark as Transferred
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
