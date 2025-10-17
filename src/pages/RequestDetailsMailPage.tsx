import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { requestsApi, approvalsApi, adminApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useTranslation } from "@/hooks/use-translation";
import { useLanguageStore } from "@/hooks/use-language";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus } from "lucide-react";
import type { Request, UserRole } from "@/types";

export default function RequestDetailsMailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const { direction, language } = useLanguageStore();

  const [request, setRequest] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Array<any>>([]);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Action states
  const [rejectionReason, setRejectionReason] = useState("");
  const [newQuoteVendor, setNewQuoteVendor] = useState("");
  const [newQuoteUrl, setNewQuoteUrl] = useState("");
  const [newQuoteTotal, setNewQuoteTotal] = useState<string>("");
  const [newQuoteNotes, setNewQuoteNotes] = useState("");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Load request details
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await requestsApi.getRequest(id);
        setRequest(res.data || null);
      } catch (e) {
        setError((e as any)?.message || "Failed to load request");
        console.error("Failed to load request", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Load comments
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const resp = await requestsApi.getComments(id);
        setComments(resp.data || []);
      } catch (e) {
        console.error("Failed to load comments", e);
      }
    })();
  }, [id]);

  const handlePostComment = async () => {
    if (!newComment.trim() || !id) return;
    try {
      setIsPostingComment(true);
      await requestsApi.addComment(id, { content: newComment.trim() });
      setNewComment("");
      // Refresh comments
      const resp = await requestsApi.getComments(id);
      setComments(resp.data || []);
    } catch (e) {
      console.error("Failed to post comment", e);
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    try {
      setActionInProgress("approve");
      const resp = await approvalsApi.approveRequest(id, {});
      setRequest(resp.data || null);
    } catch (e) {
      console.error("Failed to approve", e);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async () => {
    if (!id || !rejectionReason.trim()) return;
    try {
      setActionInProgress("reject");
      const resp = await approvalsApi.rejectRequest(id, { comment: rejectionReason });
      setRequest(resp.data || null);
      setRejectionReason("");
    } catch (e) {
      console.error("Failed to reject", e);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleAddQuote = async () => {
    if (!id || !newQuoteVendor.trim() || !newQuoteUrl.trim() || !newQuoteTotal) return;
    try {
      setActionInProgress("addQuote");
      const resp = await requestsApi.uploadQuoteUrl(id, {
        vendor_name: newQuoteVendor.trim(),
        quote_total: Number(newQuoteTotal),
        file_url: newQuoteUrl.trim(),
        notes: newQuoteNotes.trim() || undefined,
      });
      setRequest(resp.data || null);
      setNewQuoteVendor("");
      setNewQuoteUrl("");
      setNewQuoteTotal("");
      setNewQuoteNotes("");
    } catch (e) {
      console.error("Failed to add quote", e);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSelectQuote = async (quoteId: string | number) => {
    if (!id) return;
    try {
      setActionInProgress("selectQuote");
      const resp = await approvalsApi.selectQuote(id, { quote_id: Number(quoteId) });
      setRequest(resp.data || null);
    } catch (e) {
      console.error("Failed to select quote", e);
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-warning border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-subtext">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">{error || "Request not found"}</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const isType = (type: "purchase" | "project") => request.type === type;
  const isPurchase = isType("purchase");

  // Determine user permissions
  const canApprove =
    (user?.role === "DIRECT_MANAGER" && request.state === "SUBMITTED" && isPurchase) ||
    (user?.role === "FINAL_MANAGER" && request.state === "SUBMITTED" && !isPurchase) ||
    (user?.role === "FINAL_MANAGER" && request.state === "DM_APPROVED" && isPurchase && (request as any)?.quotes?.length > 0);

  const canReject =
    (user?.role === "DIRECT_MANAGER" && request.state === "SUBMITTED" && isPurchase) ||
    (user?.role === "FINAL_MANAGER" && request.state === "SUBMITTED" && !isPurchase);

  const canAddQuotes = user?.role === "ACCOUNTANT" && request.state === "DM_APPROVED" && isPurchase;
  const canSelectQuote = user?.role === "FINAL_MANAGER" && request.state === "DM_APPROVED" && isPurchase;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-US", {
      style: "currency",
      currency: "SAR",
    }).format(amount);
  };

  const getStateColor = (state: string) => {
    const stateColorMap: Record<string, string> = {
      DRAFT: "bg-gray-100 text-gray-800",
      SUBMITTED: "bg-blue-100 text-blue-800",
      DM_APPROVED: "bg-green-100 text-green-800",
      ACCT_APPROVED: "bg-purple-100 text-purple-800",
      FINAL_APPROVED: "bg-emerald-100 text-emerald-800",
      FUNDS_TRANSFERRED: "bg-cyan-100 text-cyan-800",
      DM_REJECTED: "bg-red-100 text-red-800",
      ACCT_REJECTED: "bg-red-100 text-red-800",
      FINAL_REJECTED: "bg-red-100 text-red-800",
    };
    return stateColorMap[state] || "bg-gray-100 text-gray-800";
  };

  return (
    <div dir={direction} className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-warning via-warning/95 to-warning/90 text-warning-foreground p-4 mb-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-warning-foreground hover:bg-warning-foreground/10"
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{request.title}</h1>
              <p className="text-sm text-warning-foreground/80">Requester: {request.requester?.name}</p>
            </div>
          </div>
          <Badge className={getStateColor(request.state)}>
            {request.state}
          </Badge>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10">
        {/* Main Content - Left */}
        <div className="lg:col-span-2 space-y-6">
          {/* Information Card */}
          <Card>
            <CardHeader>
              <CardTitle>Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-subtext">Status</p>
                  <p className="text-sm font-medium mt-1">{request.state}</p>
                </div>
                <div>
                  <p className="text-sm text-subtext">Submitted</p>
                  <p className="text-sm font-medium mt-1">
                    {new Date(request.created_at).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-subtext">Cost</p>
                  <p className="text-sm font-bold text-warning mt-1">{formatCurrency(request.desired_cost)}</p>
                </div>
                <div>
                  <p className="text-sm text-subtext">Needed By</p>
                  <p className="text-sm font-medium mt-1">
                    {new Date(request.needed_by_date).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US")}
                  </p>
                </div>
              </div>
              {request.description && (
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-subtext mb-2">Description</p>
                  <p className="text-sm text-foreground">{request.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Items Card */}
          {isPurchase && (request as any)?.items?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border">
                      <tr>
                        <th className="text-left py-2 font-semibold">Item</th>
                        <th className="text-left py-2 font-semibold">Qty</th>
                        <th className="text-left py-2 font-semibold">Cost</th>
                        <th className="text-left py-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(request as any).items.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-border hover:bg-secondary/30">
                          <td className="py-2">{item.name}</td>
                          <td className="py-2">{item.quantity}</td>
                          <td className="py-2">{formatCurrency(item.unit_price)}</td>
                          <td className="py-2 font-bold">{formatCurrency(item.quantity * item.unit_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quotes Card */}
          {isPurchase && (
            <Card>
              <CardHeader>
                <CardTitle>Quotes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!(request as any)?.quotes || (request as any).quotes.length === 0 ? (
                  <p className="text-sm text-subtext">No quotes yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-border">
                        <tr>
                          <th className="text-left py-2 font-semibold">Vendor</th>
                          <th className="text-left py-2 font-semibold">Total</th>
                          <th className="text-left py-2 font-semibold">File</th>
                          <th className="text-left py-2 font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(request as any).quotes.map((quote: any) => (
                          <tr key={quote.id} className="border-b border-border">
                            <td className="py-2">{quote.vendor_name}</td>
                            <td className="py-2">{formatCurrency(quote.quote_total)}</td>
                            <td className="py-2">
                              {quote.file_url ? (
                                <a href={quote.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                  View
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="py-2">
                              <Button
                                size="sm"
                                disabled={!canSelectQuote || actionInProgress === "selectQuote"}
                                onClick={() => handleSelectQuote(quote.id)}
                                variant={(request as any).selected_quote_id === quote.id ? "default" : "outline"}
                              >
                                {(request as any).selected_quote_id === quote.id ? "Selected" : "Select"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {canAddQuotes && (
                  <div className="pt-4 border-t border-border space-y-3">
                    <h3 className="font-semibold">Add New Quote</h3>
                    <div className="grid grid-cols-4 gap-2">
                      <input
                        placeholder="Vendor"
                        value={newQuoteVendor}
                        onChange={(e) => setNewQuoteVendor(e.target.value)}
                        className="rounded border border-border bg-background px-2 py-1 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Total"
                        value={newQuoteTotal}
                        onChange={(e) => setNewQuoteTotal(e.target.value)}
                        className="rounded border border-border bg-background px-2 py-1 text-sm"
                      />
                      <input
                        placeholder="URL"
                        value={newQuoteUrl}
                        onChange={(e) => setNewQuoteUrl(e.target.value)}
                        className="rounded border border-border bg-background px-2 py-1 text-sm"
                      />
                      <input
                        placeholder="Notes"
                        value={newQuoteNotes}
                        onChange={(e) => setNewQuoteNotes(e.target.value)}
                        className="rounded border border-border bg-background px-2 py-1 text-sm"
                      />
                    </div>
                    <Button
                      onClick={handleAddQuote}
                      disabled={!newQuoteVendor || !newQuoteUrl || !newQuoteTotal || actionInProgress === "addQuote"}
                      className="w-full bg-warning text-warning-foreground hover:bg-warning/90"
                    >
                      Add Quote
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(canApprove || canReject) && (
                <>
                  {canReject && (
                    <div className="space-y-2">
                      <textarea
                        placeholder="Rejection reason..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleApprove}
                          disabled={actionInProgress === "approve"}
                          className="flex-1 bg-warning text-warning-foreground hover:bg-warning/90"
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={handleReject}
                          disabled={!rejectionReason.trim() || actionInProgress === "reject"}
                          className="flex-1 bg-red-600 text-white hover:bg-red-700"
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                  {canApprove && !canReject && (
                    <Button
                      onClick={handleApprove}
                      disabled={actionInProgress === "approve"}
                      className="w-full bg-warning text-warning-foreground hover:bg-warning/90"
                    >
                      Approve
                    </Button>
                  )}
                </>
              )}
              {!canApprove && !canReject && !canAddQuotes && (
                <p className="text-sm text-subtext">No actions available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Comments */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded bg-secondary/30 p-3">
                    <p className="text-xs text-subtext font-medium">{comment.author || "User"}</p>
                    <p className="text-sm mt-1 text-foreground">{comment.content}</p>
                    <p className="text-xs text-subtext mt-1">
                      {new Date(comment.created_at).toLocaleString(language === "ar" ? "ar-EG" : "en-US")}
                    </p>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-sm text-subtext text-center py-4">No comments yet</p>
                )}
              </div>

              <textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
                rows={4}
              />
              <Button
                onClick={handlePostComment}
                disabled={!newComment.trim() || isPostingComment}
                className="w-full bg-warning text-warning-foreground hover:bg-warning/90"
              >
                Post Comment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
