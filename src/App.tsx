import React, { useEffect, useMemo, useState } from "react";
import { authService } from "@/lib/auth";
import { approvalsApi, requestsApi, adminApi, apiClient, notificationsApi } from "@/lib/api";
import InventoryManagement from "@/pages/InventoryManagement";
import SalesVisitManagement from "@/pages/SalesVisitManagement";
import InventoryRequestManagement from "@/pages/InventoryRequestManagement";
import StudioBookingManagement from "@/pages/StudioBookingManagement";
import {
  Plus,
  FileText,
  FolderPlus,
  ChevronRight,
  Filter,
  X,
  Settings,
  Menu,
  Users,
  Home,
  Bell,
  Search,
  CheckSquare,
  Clock,
  Calendar,
  TrendingUp,
  Download,
  BarChart3,
  Activity,
  ChevronDown,
  FileSpreadsheet,
  Package,
  Camera,
} from "lucide-react";

// Single-file SPA for Purchase Requests styled like an email client
// - TypeScript + React Hooks
// - Tailwind CSS UI
// - i18n (en/ar) with LTR/RTL
// - Mock async actions (TODO: Connect to backend API)

// ----------------------
// Types
// ----------------------
export type PRItem = { name: string; quantity: number; estimatedCost: number };

export type PurchaseRequest = {
  id: string;
  title: string;
  requester: string;
  requesterId?: string | number;
  directManagerId?: string | number;
  directManagerName?: string;
  submittedDate: string; // ISO string
  status: "Pending" | "Approved" | "Rejected" | "Awaiting Payment" | "Awaiting Selection" | "Active" | "Processed" | "Processing" | "Done" | "Paid";
  rawState?: string;
  type?: 'purchase' | 'project';
  description: string;
  items: PRItem[];
  totalEstimatedCost: number;
  quotes?: Array<{ id: string | number; vendorName: string; quoteTotal: number; fileUrl?: string; notes?: string }>;
  selectedQuoteId?: string | number;
  quotations?: string;
  rejectionReason?: string;
  // Project-specific fields
  clientName?: string;
  location?: string;
  startTime?: string; // ISO string
  endTime?: string;   // ISO string
  totalCost?: number;
  totalBenefit?: number;
  totalPrice?: number;
  activeFrom?: string; // ISO string
};

export type User = {
  id: string | number;
  name: string;
  role: "user" | "manager" | "accountant" | "sales";
  email?: string;
  apiRole?: "USER" | "DIRECT_MANAGER" | "ACCOUNTANT" | "ADMIN" | "FINAL_MANAGER" | "SALES_REP" | "SUPER_ADMIN";
};

type Language = "en" | "ar";

// ----------------------
// Utilities
// ----------------------
const LS_KEYS = {
  user: "app.currentUser",
  lang: "app.language",
  requests: "app.requests",
  token: "app.authToken",
};

function formatCurrency(n: number, lang: Language) {
  try {
    return new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function clsx(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(" ");
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// Map backend roles to UI roles
function mapApiRoleToUi(role?: string): User["role"] {
  switch (role) {
    case "ACCOUNTANT":
      return "accountant";
    case "DIRECT_MANAGER":
    case "FINAL_MANAGER":
    case "ADMIN":
    case "SUPER_ADMIN":
      return "manager";
    case "SALES_REP":
      return "sales";
    case "USER":
    default:
      return "user";
  }
}

// Map backend PR state to UI status
function mapApiStateToUiStatus(state?: string, type?: 'purchase' | 'project'): PurchaseRequest["status"] {
  switch (state) {
    case "FINAL_APPROVED":
      return type === 'project' ? 'Active' : "Approved";
    case "FUNDS_TRANSFERRED":
      return "Processed";
    // New project flow states
    case "PROCESSING":
      return "Processing";
    case "DONE":
      return "Done";
    case "PAID":
      return "Paid";
    case "DM_REJECTED":
    case "ACCT_REJECTED":
    case "FINAL_REJECTED":
      return "Rejected";
    case "DM_APPROVED":
      return "Awaiting Payment";
    case "ACCT_APPROVED":
      return "Awaiting Payment";
    case "SUBMITTED":
    case "DRAFT":
    default:
      return "Pending";
  }
}

// Map backend request model to UI model
function mapApiRequestToUi(req: any): PurchaseRequest {
  const items = Array.isArray(req.items)
    ? req.items.map((it: any) => ({
        name: it.name ?? "Item",
        quantity: Number(it.quantity) || 0,
        estimatedCost: Number(it.unit_price) || 0,
      }))
    : [];
  const totalEstimatedCost = items.reduce((s: number, it: PRItem) => s + it.quantity * it.estimatedCost, 0);
  const quotes = Array.isArray(req.quotes)
    ? req.quotes.map((q: any) => {
        const totalRaw = q.quote_total ?? q.quoteTotal;
        const totalNum = Number(totalRaw ?? 0);
        const safeTotal = Number.isFinite(totalNum) ? totalNum : 0;
        return {
          id: q.id ?? uid(),
          vendorName: q.vendor_name ?? q.vendorName ?? "",
          quoteTotal: safeTotal,
          fileUrl: q.file_url ?? q.filePath ?? q.file_path,
          notes: q.notes,
        };
      })
    : undefined;
  const selected = req.selectedQuote ?? req.selected_quote;
  const type: 'purchase' | 'project' = req.type === 'project' ? 'project' : 'purchase';
  // Extract rejection reason from approvals
  let rejectionReason: string | undefined = undefined;
  if (Array.isArray(req.approvals)) {
    const rejectionApproval = req.approvals.find((approval: any) => 
      approval.decision === 'REJECTED' && approval.comment
    );
    rejectionReason = rejectionApproval?.comment;
  }
  
  // Determine status based on state and quotes availability
  let status = mapApiStateToUiStatus(req.state, type);
  if (req.state === 'DM_APPROVED') {
    // If quotes exist, it's awaiting selection by Final Manager, otherwise awaiting payment (quotes from accountant)
    status = quotes && quotes.length > 0 ? "Awaiting Selection" : "Awaiting Payment";
  }
  
  return {
    id: String(req.id),
    title: req.title ?? req.request_id ?? "Request",
    requester: req.requester?.name ?? req.requester?.first_name ?? req.requester_id ?? "",
    requesterId: req.requester?.id ?? req.requester_id,
    directManagerId: req.direct_manager_id ?? req.directManagerId ?? req.directManager?.id,
    directManagerName: req.direct_manager?.name ?? req.directManager?.name,
    submittedDate: req.created_at ?? new Date().toISOString(),
    status,
    rawState: req.state,
    type,
    description: req.description ?? "",
    items,
    totalEstimatedCost,
    quotes,
  selectedQuoteId: selected?.id ?? req.selected_quote_id ?? req.selectedQuoteId,
    quotations: undefined,
    rejectionReason,
    // Project fields mapping
    clientName: req.client_name ?? req.clientName,
    location: req.location,
    startTime: req.start_time ?? req.startTime,
    endTime: req.end_time ?? req.endTime,
    totalCost: Number.isFinite(Number(req.total_cost)) ? Number(req.total_cost) : undefined,
    totalBenefit: Number.isFinite(Number(req.total_benefit)) ? Number(req.total_benefit) : undefined,
    totalPrice: Number.isFinite(Number(req.total_price)) ? Number(req.total_price) : undefined,
    activeFrom: req.active_from ?? req.activeFrom,
  };
}

// ----------------------
// i18n
// ----------------------
const i18n: Record<Language, Record<string, string>> = {
  en: {
    appTitle: "Action-G",
    loginTitle: "Sign in",
    emailOrUsername: "Email or Username",
    password: "Password",
    role: "Role",
    selectRole: "Select role",
    user: "User",
    manager: "Manager",
    accountant: "Accountant",
    sales: "Sales Representative",
    login: "Login",
    logout: "Logout",
    welcome: "Welcome! Select a request from the list or create a new one.",
    createNew: "Create New Request",
    search: "Search...",
    noRequests: "No requests found.",
    loading: "Loading...",
    requests: "Requests",
    inventory: "Inventory",
    inventoryManagement: "Inventory Management",
    salesVisits: "Sales Visits",
    myVisits: "My Visits",
    allVisits: "All Sales Visits",
    newVisit: "New Visit",
    visitDetails: "Visit Details",
    manageYourClientVisits: "Manage your client visits and follow-ups",
    manageAllSalesVisits: "Manage all sales representative visits",
    totalVisits: "Total Visits",
    pendingReview: "Pending Review",
    approved: "Approved",
    conversionRate: "Conversion Rate",
    searchVisits: "Search visits...",
    allStatuses: "All Statuses",
    draft: "Draft",
    submitted: "Submitted",
    pending_review: "Pending Review",
    actionRequired: "Action Required",
    action_required: "Action Required",
    quotationSent: "Quotation Sent",
    quotation_sent: "Quotation Sent",
    closedWon: "Closed - Won",
    closed_won: "Closed - Won",
    closedLost: "Closed - Lost",
    closed_lost: "Closed - Lost",
    visitDate: "Visit Date",
    client: "Client",
    salesRep: "Sales Rep",
    businessType: "Business Type",
    nextAction: "Next Action",
    viewDetails: "View Details",
    noVisitsFound: "No visits found",
    createFirstVisit: "Create your first visit",
    editVisit: "Edit Visit",
    selectClient: "Select Client",
    change: "Change",
    addNewClient: "Add New Client",
    storeName: "Store Name",
    contactPerson: "Contact Person",
    mobile: "Mobile",
    mobile2: "Mobile 2",
    address: "Address",
    selectBusinessType: "Select Business Type",
    pleaseFillRequiredFields: "Please fill all required fields",
    failedToCreateClient: "Failed to create client",
    failedToSaveVisit: "Failed to save visit",
    update: "Update",
    exportExcel: "Export to Excel",
    exportPdf: "Export to PDF",
    exportFailed: "Failed to export",
    statusUpdated: "Status updated successfully",
    updateFailed: "Failed to update status",
    notesAdded: "Notes added successfully",
    requester: "Requester",
    submittedDate: "Submitted",
    status: "Status",
    details: "Details",
    information: "Information",
    description: "Description",
    items: "Items",
    item: "Item",
    quantity: "Quantity",
    estimatedCost: "Estimated Cost",
    totalEstimatedCost: "Total Estimated Cost",
    workflowHistory: "Workflow / History",
    createdBy: "Created by",
    approvedBy: "Approved by",
    rejectedBy: "Rejected by",
    dmApprovedWaiting: "Approved by Direct Manager — Waiting for Accountant",
    quotesAddedWaiting: "Quotes added by Accountant — Waiting for Final Manager selection",
    approve: "Approve",
    reject: "Reject",
    rejectionReason: "Rejection Reason",
    submit: "Submit",
    submitAndProcess: "Submit & Process Payment",
    quotation: "Quotation",
    title: "Task",
    submitRequest: "Submit Request",
    cancel: "Cancel",
    actions: "Actions",
    processedBy: "Payment processed by Accountant",
    language: "Language",
    english: "English",
    arabic: "العربية",
    approvedSuccess: "Request approved",
    rejectedSuccess: "Request rejected",
    submitSuccess: "Request submitted",
    quoteUploaded: "Quote uploaded",
    quoteSelected: "Quote selected",
    createSuccess: "Request created",
    actionFailed: "Action failed",
    quotes: "Quotes",
    noQuotesYet: "No quotes yet.",
    managerActionHint: "No actions available for this stage. Direct Managers act on SUBMITTED; Final Managers select quotes after Accountant adds them.",
    accountantWaitingHint: "Waiting for Direct Manager approval. Accountants can add quotes and approve after DM approval.",
    accountantStateHint: "Accountants can only act on requests approved by Direct Manager.",
  // Admin
  adminPanel: "Admin Panel",
  createUser: "Create User",
  userName: "Full name",
  userEmail: "Email",
  userPassword: "Password",
  userRole: "Role",
  create: "Create",
  deleteRequest: "Delete Request",
  deleteConfirm: "Are you sure you want to delete this request? This action cannot be undone.",
  userCreated: "User created",
  requestDeleted: "Request deleted",
    quotesWaitingHint: "Waiting for Direct Manager approval before quotes can be added.",
    quotesStateHint: "Quotes can only be added after Direct Manager approval.",
    finalManagerWaitingQuotes: "Waiting for Accountant to add quotes before selection.",
    finalManagerSelectQuote: "Select a quote to approve this request.",
    filters: "Filters",
    requesterFilter: "Requester",
    dateFrom: "Date from",
    dateTo: "Date to",
    minCost: "Min cost",
    maxCost: "Max cost",
    clearFilters: "Clear Filters",
  assignedToMe: "Assigned to me",
    // Project
    submitProject: "Submit Project",
    projectDetails: "Project Details",
    clientName: "Client Name",
    location: "Location",
    startTime: "Start Time",
    endTime: "Estimated End Time",
    totalCost: "Total Cost",
    totalBenefit: "Total Benefit",
    totalPrice: "Total Price",
    activeFrom: "Active From",
    optionalItemsHelp: "Adding items is optional; use them to break down the project if helpful.",
    projectActive: "Project is Active",
    projectValidationRequired: "Please fill all required project fields",
    projectValidationEndAfterStart: "End time must be after start time",
    // Project flow i18n
    processing: "Processing",
    done: "Done",
    paid: "Paid",
    markProjectDone: "Mark Project Done",
    confirmClientPaid: "Confirm Client Paid",
    markedDoneSuccess: "Project marked as done",
    paidConfirmedSuccess: "Payment confirmed",
    // Action hints - contextual
    noActionsGeneric: "No actions available for this stage.",
    hintDmApproveReject: "Direct Manager: You can approve or reject submitted purchase requests.",
    hintDmNoAction: "Direct Manager: No actions at this stage.",
    hintFmProjectApproveReject: "Final Manager: Approve or reject this submitted project.",
    hintFmProjectNoAction: "Final Manager: No actions for project at this stage.",
    hintRequesterMarkDone: "Requester: Mark the project as done when it has ended.",
    hintRequesterAwaitingPaid: "Requester: Awaiting accountant confirmation of payment.",
    hintRequesterAwaitingFm: "Requester: Awaiting Final Manager decision.",
    hintAccountantConfirmPaid: "Accountant: Confirm client payment once received.",
    hintAccountantProjectWait: "Accountant: Waiting for requester to mark project done.",
    hintAccountantPurchaseWait: "Accountant: Waiting for Direct Manager approval to add quotes.",
    hintAcctAddQuotes: "Accountant: Add quotes now.",
    hintAcctAddMoreOrWaitFm: "Accountant: You can add more quotes or wait for Final Manager selection.",
    hintFmCanApproveNow: "Final Manager: You can approve now after selecting a quote.",
    hintFmNoActionPurchase: "Final Manager: No actions until quotes are added by Accountant.",
    // Comments panel
    comments: "Comments",
    noCommentsYet: "No comments yet.",
    writeComment: "Write a comment...",
    postComment: "Post Comment",
    posting: "Posting…",
    discussionComments: "Discussion & Comments",
    post: "Post",
    commentsLoadError: "Failed to load comments.",
    retry: "Retry",
  refresh: "Refresh",
    postShortcutHint: "Press Ctrl+Enter to post",
    directManager: "Direct Manager",
    selectDirectManager: "Select Direct Manager",
    // Inventory Management (page)
    inventoryManageSubtitle: "Manage tools, equipment, and materials",
    addItem: "Add Item",
    searchInventoryPlaceholder: "Search by name, code, or description...",
    allCategories: "All Categories",
    loadingInventory: "Loading inventory...",
    noInventoryItems: "No inventory items",
    inventoryEmptyHelp: "Get started by adding your first inventory item.",
    category: "Category",
    total: "Total",
    reserved: "Reserved",
    available: "Available",
    maintenanceDue: "Maintenance Due",
    inactive: "Inactive",
    addInventoryItem: "Add Inventory Item",
    featureComingSoon: "Feature coming soon. Use the backend API directly for now.",
    close: "Close",
    edit: "Edit",
    conditionGood: "Good",
    conditionFair: "Fair",
    conditionNeedsMaintenance: "Needs maintenance",
    // Inventory add/edit form
    addItemTitle: "Add Inventory Item",
    editItemTitle: "Edit Inventory Item",
    name: "Name",
    descriptionField: "Description",
    categoryField: "Category",
    quantityField: "Quantity",
    unitField: "Unit",
    unitCostField: "Unit Cost",
    locationField: "Location",
    conditionField: "Condition",
    lastMaintenanceDate: "Last Maintenance Date",
    nextMaintenanceDate: "Next Maintenance Date",
    notesField: "Notes",
    save: "Save",
    saving: "Saving...",
    cancelSmall: "Cancel",
    requiredField: "Required",
    numberMustBePositive: "Must be a positive number",
    itemCreated: "Item created",
    itemUpdated: "Item updated",
    createFailed: "Create failed",
    itemUpdateFailed: "Update failed",
    selectCategory: "Select Category",
    customCategory: "Custom Category",
    enterCustomCategory: "Enter custom category",
    browseInventory: "Browse Inventory",
    searchAction: "Search",
    inventoryItemsOptional: "Inventory Items (Optional)",
    inventoryItemsHelp: "Select tools and equipment needed for this project",
  },
  ar: {
    appTitle: "Action-G",
    loginTitle: "تسجيل الدخول",
    emailOrUsername: "البريد الإلكتروني أو اسم المستخدم",
    password: "كلمة المرور",
    role: "الدور",
    selectRole: "اختر الدور",
    user: "مستخدم",
    manager: "مدير",
    accountant: "محاسب",
    sales: "مندوب مبيعات",
    login: "تسجيل الدخول",
    logout: "تسجيل الخروج",
    welcome: "مرحبًا! اختر طلبًا من القائمة أو أنشئ طلبًا جديدًا.",
    createNew: "إنشاء طلب جديد",
    search: "بحث...",
    noRequests: "لا توجد طلبات.",
    loading: "جاري التحميل...",
    requests: "الطلبات",
    inventory: "المخزون",
    inventoryManagement: "إدارة المخزون",
    salesVisits: "زيارات المبيعات",
    myVisits: "زياراتي",
    allVisits: "جميع زيارات المبيعات",
    newVisit: "زيارة جديدة",
    visitDetails: "تفاصيل الزيارة",
    manageYourClientVisits: "إدارة زيارات العملاء والمتابعات",
    manageAllSalesVisits: "إدارة جميع زيارات مندوبي المبيعات",
    totalVisits: "إجمالي الزيارات",
    pendingReview: "قيد المراجعة",
    approved: "موافق عليها",
    conversionRate: "معدل التحويل",
    searchVisits: "بحث في الزيارات...",
    allStatuses: "جميع الحالات",
    draft: "مسودة",
    submitted: "مُرسلة",
    pending_review: "قيد المراجعة",
    actionRequired: "يتطلب إجراء",
    action_required: "يتطلب إجراء",
    quotationSent: "تم إرسال العرض",
    quotation_sent: "تم إرسال العرض",
    closedWon: "مغلقة - فوز",
    closed_won: "مغلقة - فوز",
    closedLost: "مغلقة - خسارة",
    closed_lost: "مغلقة - خسارة",
    visitDate: "تاريخ الزيارة",
    client: "العميل",
    salesRep: "مندوب المبيعات",
    businessType: "نوع النشاط",
    nextAction: "الإجراء التالي",
    viewDetails: "عرض التفاصيل",
    noVisitsFound: "لم يتم العثور على زيارات",
    createFirstVisit: "إنشاء أول زيارة",
    editVisit: "تعديل الزيارة",
    selectClient: "اختر عميل",
    change: "تغيير",
    addNewClient: "إضافة عميل جديد",
    storeName: "اسم المتجر",
    contactPerson: "شخص الاتصال",
    mobile: "الجوال",
    mobile2: "الجوال 2",
    address: "العنوان",
    selectBusinessType: "اختر نوع النشاط",
    pleaseFillRequiredFields: "يرجى ملء جميع الحقول المطلوبة",
    failedToCreateClient: "فشل إنشاء العميل",
    failedToSaveVisit: "فشل حفظ الزيارة",
    update: "تحديث",
    exportExcel: "تصدير إلى Excel",
    exportPdf: "تصدير إلى PDF",
    exportFailed: "فشل التصدير",
    statusUpdated: "تم تحديث الحالة بنجاح",
    updateFailed: "فشل تحديث الحالة",
    notesAdded: "تمت إضافة الملاحظات بنجاح",
    requester: "مُقدِّم الطلب",
    submittedDate: "تاريخ التقديم",
    status: "الحالة",
    details: "التفاصيل",
    information: "المعلومات",
    description: "الوصف",
    items: "العناصر",
    item: "عنصر",
    quantity: "الكمية",
    estimatedCost: "التكلفة التقديرية",
    totalEstimatedCost: "إجمالي التكلفة التقديرية",
    workflowHistory: "سير العمل / السجل",
    createdBy: "تم الإنشاء بواسطة",
    approvedBy: "تمت الموافقة بواسطة",
    rejectedBy: "تم الرفض بواسطة",
    dmApprovedWaiting: "تمت الموافقة من المدير المباشر — في انتظار المحاسب",
    quotesAddedWaiting: "تمت إضافة عروض الأسعار من المحاسب — في انتظار اختيار المدير النهائي",
    approve: "موافقة",
    reject: "رفض",
    rejectionReason: "سبب الرفض",
    submit: "إرسال",
    submitAndProcess: "إرسال ومعالجة الدفع",
    quotation: "التسعير",
    title: "المهمة",
    submitRequest: "إرسال الطلب",
    cancel: "إلغاء",
    actions: "إجراءات",
    processedBy: "تمت معالجة الدفع بواسطة المحاسب",
    language: "اللغة",
    english: "English",
    arabic: "العربية",
    // Toasts
    approvedSuccess: "تمت الموافقة على الطلب",
    rejectedSuccess: "تم رفض الطلب",
    submitSuccess: "تم إرسال الطلب",
    quoteUploaded: "تم رفع عرض السعر",
    quoteSelected: "تم اختيار عرض السعر",
  // Admin
  adminPanel: "لوحة الإدارة",
  createUser: "إنشاء مستخدم",
  userName: "الاسم الكامل",
  userEmail: "البريد الإلكتروني",
  userPassword: "كلمة المرور",
  userRole: "الدور",
  create: "إنشاء",
  deleteRequest: "حذف الطلب",
  deleteConfirm: "هل أنت متأكد من حذف هذا الطلب؟ هذا الإجراء لا يمكن التراجع عنه.",
  userCreated: "تم إنشاء المستخدم",
  requestDeleted: "تم حذف الطلب",
    createSuccess: "تم إنشاء الطلب",
    actionFailed: "فشل تنفيذ العملية",
    // Quotes
    quotes: "عروض الأسعار",
    noQuotesYet: "لا توجد عروض أسعار بعد.",
    // Action hints
    managerActionHint: "لا توجد إجراءات متاحة في هذه المرحلة. يتصرف المدراء المباشرون في الطلبات المرسلة؛ ويختار المدراء النهائيون عروض الأسعار بعد إضافتها من المحاسب.",
    accountantWaitingHint: "في انتظار موافقة المدير المباشر. يمكن للمحاسبين إضافة عروض الأسعار والموافقة بعد موافقة المدير المباشر.",
    accountantStateHint: "يمكن للمحاسبين التصرف فقط في الطلبات المعتمدة من المدير المباشر.",
    quotesWaitingHint: "في انتظار موافقة المدير المباشر قبل إمكانية إضافة عروض الأسعار.",
    quotesStateHint: "يمكن إضافة عروض الأسعار فقط بعد موافقة المدير المباشر.",
    finalManagerWaitingQuotes: "في انتظار إضافة عروض الأسعار من المحاسب قبل الاختيار.",
    finalManagerSelectQuote: "اختر عرض سعر للموافقة على هذا الطلب.",
    // Filters
    filters: "المرشحات",
    requesterFilter: "مُقدِّم الطلب",
    dateFrom: "من تاريخ",
    dateTo: "إلى تاريخ",
    minCost: "الحد الأدنى للتكلفة",
    maxCost: "الحد الأقصى للتكلفة",
    clearFilters: "مسح المرشحات",
  assignedToMe: "مُسند إليّ",
    // Project
    submitProject: "إرسال مشروع",
    projectDetails: "تفاصيل المشروع",
    clientName: "اسم العميل",
    location: "الموقع",
    startTime: "وقت البداية",
    endTime: "الوقت المتوقع للانتهاء",
    totalCost: "إجمالي التكلفة",
    totalBenefit: "إجمالي العائد",
    totalPrice: "إجمالي السعر",
    activeFrom: "نشط منذ",
    optionalItemsHelp: "إضافة العناصر اختيارية؛ استخدمها لتقسيم المشروع إذا كان ذلك مفيدًا.",
    projectActive: "المشروع نشط",
    projectValidationRequired: "يرجى تعبئة جميع الحقول المطلوبة للمشروع",
    projectValidationEndAfterStart: "يجب أن يكون وقت الانتهاء بعد وقت البداية",
    // Project flow i18n
    processing: "جاري التنفيذ",
    done: "منجز",
    paid: "مدفوع",
    markProjectDone: "تحديد المشروع كمنجز",
    confirmClientPaid: "تأكيد دفع العميل",
    markedDoneSuccess: "تم تحديد المشروع كمنجز",
    paidConfirmedSuccess: "تم تأكيد الدفع",
    // Action hints - contextual
    noActionsGeneric: "لا توجد إجراءات متاحة في هذه المرحلة.",
    hintDmApproveReject: "المدير المباشر: يمكنك الموافقة أو الرفض على طلبات الشراء المرسلة.",
    hintDmNoAction: "المدير المباشر: لا توجد إجراءات في هذه المرحلة.",
    hintFmProjectApproveReject: "المدير النهائي: وافق أو ارفض هذا المشروع المرسل.",
    hintFmProjectNoAction: "المدير النهائي: لا توجد إجراءات للمشروع في هذه المرحلة.",
    hintRequesterMarkDone: "المُقدِّم: حدِّد المشروع كمنجز عند انتهائه.",
    hintRequesterAwaitingPaid: "المُقدِّم: في انتظار تأكيد المحاسب للدفع.",
    hintRequesterAwaitingFm: "المُقدِّم: في انتظار قرار المدير النهائي.",
    hintAccountantConfirmPaid: "المحاسب: أكِّد استلام دفعة العميل عند وصولها.",
    hintAccountantProjectWait: "المحاسب: في انتظار أن يحدّد المُقدِّم المشروع كمنجز.",
    hintAccountantPurchaseWait: "المحاسب: في انتظار موافقة المدير المباشر لإضافة عروض الأسعار.",
    hintAcctAddQuotes: "المحاسب: يمكنك إضافة عروض الأسعار الآن.",
    hintAcctAddMoreOrWaitFm: "المحاسب: يمكنك إضافة المزيد من العروض أو انتظار اختيار المدير النهائي.",
    hintFmCanApproveNow: "المدير النهائي: يمكنك الموافقة الآن بعد اختيار عرض السعر.",
    hintFmNoActionPurchase: "المدير النهائي: لا توجد إجراءات حتى يضيف المحاسب عروض الأسعار.",
    // Comments panel
    comments: "التعليقات",
    noCommentsYet: "لا توجد تعليقات بعد.",
    writeComment: "اكتب تعليقًا...",
    postComment: "إضافة تعليق",
    posting: "جارٍ النشر...",
    discussionComments: "النقاش والتعليقات",
    post: "نشر",
    commentsLoadError: "فشل تحميل التعليقات.",
    retry: "إعادة المحاولة",
  refresh: "تحديث",
    postShortcutHint: "اضغط Ctrl+Enter للنشر",
    directManager: "المدير المباشر",
    selectDirectManager: "اختر المدير المباشر",
    // Inventory Management (page)
    inventoryManageSubtitle: "إدارة الأدوات والمعدات والمواد",
    addItem: "إضافة عنصر",
    searchInventoryPlaceholder: "   بحث بالاسم أو الكود أو الوصف...   ",
    allCategories: "كل الفئات",
    loadingInventory: "جارٍ تحميل المخزون...",
    noInventoryItems: "لا توجد عناصر في المخزون",
    inventoryEmptyHelp: "ابدأ بإضافة أول عنصر في المخزون.",
    category: "الفئة",
    total: "الإجمالي",
    reserved: "المحجوز",
    available: "المتاح",
    maintenanceDue: "صيانة مطلوبة",
    inactive: "غير نشط",
    addInventoryItem: "إضافة عنصر مخزون",
    featureComingSoon: "الميزة قادمة قريبًا. استخدم واجهة البرمجة الخلفية حاليًا.",
    close: "إغلاق",
    edit: "تعديل",
    conditionGood: "جيد",
    conditionFair: "متوسط",
    conditionNeedsMaintenance: "يحتاج صيانة",
    // Inventory add/edit form
    addItemTitle: "إضافة عنصر مخزون",
    editItemTitle: "تعديل عنصر مخزون",
    name: "الاسم",
    descriptionField: "الوصف",
    categoryField: "الفئة",
    quantityField: "الكمية",
    unitField: "الوحدة",
    unitCostField: "تكلفة الوحدة",
    locationField: "الموقع",
    conditionField: "الحالة",
    lastMaintenanceDate: "تاريخ آخر صيانة",
    nextMaintenanceDate: "تاريخ الصيانة القادمة",
    notesField: "ملاحظات",
    save: "حفظ",
    saving: "جارٍ الحفظ...",
    cancelSmall: "إلغاء",
    requiredField: "حقل مطلوب",
    numberMustBePositive: "يجب أن يكون رقمًا موجبًا",
    itemCreated: "تم إنشاء العنصر",
    itemUpdated: "تم تحديث العنصر",
    createFailed: "فشل الإنشاء",
    itemUpdateFailed: "فشل التحديث",
    selectCategory: "اختر الفئة",
    customCategory: "فئة مخصصة",
    enterCustomCategory: "أدخل فئة مخصصة",
    browseInventory: "تصفح المخزون",
    searchAction: "بحث",
    inventoryItemsOptional: "عناصر المخزون (اختياري)",
    inventoryItemsHelp: "اختر الأدوات والمعدات اللازمة لهذا المشروع",
  },
};

// ----------------------
// Mock data
// ----------------------
function seedMockRequests(): PurchaseRequest[] {
  const today = new Date();
  return [
    {
      id: uid(),
      title: "Office Chairs",
      requester: "Alice",
      submittedDate: today.toISOString(),
      status: "Pending",
      description: "Purchase ergonomic office chairs for the new team.",
      items: [
        { name: "Ergo Chair X", quantity: 5, estimatedCost: 180 },
        { name: "Footrest", quantity: 5, estimatedCost: 30 },
      ],
      totalEstimatedCost: 5 * 180 + 5 * 30,
    },
    {
      id: uid(),
      title: "Laptops",
      requester: "Bob",
      submittedDate: new Date(today.getTime() - 86400000).toISOString(),
      status: "Approved",
      description: "5 developer laptops with 32GB RAM and 1TB SSD.",
      items: [
        { name: "Dev Laptop Pro", quantity: 5, estimatedCost: 1400 },
      ],
      totalEstimatedCost: 5 * 1400,
    },
    {
      id: uid(),
      title: "Conference Room Setup",
      requester: "Carol",
      submittedDate: new Date(today.getTime() - 2 * 86400000).toISOString(),
      status: "Rejected",
      description: "Projector, speakers, and whiteboard for conference room.",
      items: [
        { name: "4K Projector", quantity: 1, estimatedCost: 1200 },
        { name: "Speaker Set", quantity: 1, estimatedCost: 200 },
        { name: "Whiteboard", quantity: 1, estimatedCost: 150 },
      ],
      totalEstimatedCost: 1550,
      rejectionReason: "Budget constraints",
    },
  ];
}

// ----------------------
// Status helpers
// ----------------------
function statusBadgeColor(status: PurchaseRequest["status"]) {
  switch (status) {
    case "Pending":
      return "bg-gradient-to-r from-yellow-400 to-orange-400 text-white ring-yellow-300 shadow-lg";
    case "Approved":
      return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white ring-blue-300 shadow-lg";
    case "Rejected":
      return "bg-gradient-to-r from-red-500 to-pink-500 text-white ring-red-300 shadow-lg";
    case "Awaiting Payment":
      return "bg-gradient-to-r from-amber-500 to-yellow-500 text-white ring-amber-300 shadow-lg";
    case "Active":
      return "bg-gradient-to-r from-green-500 to-emerald-500 text-white ring-green-300 shadow-lg animate-pulse";
    case "Awaiting Selection":
      return "bg-gradient-to-r from-purple-500 to-indigo-500 text-white ring-purple-300 shadow-lg";
    case "Processed":
      return "bg-gradient-to-r from-blue-600 to-indigo-600 text-white ring-blue-400 shadow-lg";
    case "Processing":
      return "bg-gradient-to-r from-amber-400 to-orange-400 text-white ring-amber-300 shadow-lg";
    case "Done":
      return "bg-gradient-to-r from-emerald-600 to-green-600 text-white ring-emerald-400 shadow-lg";
    case "Paid":
      return "bg-gradient-to-r from-teal-500 to-cyan-500 text-white ring-teal-300 shadow-lg";
    default:
      return "bg-gradient-to-r from-gray-400 to-gray-500 text-white ring-gray-300 shadow-md";
  }
}

// ----------------------
// Components (single-file)
// ----------------------

// Inventory Selection Component
function InventorySelectionInline({
  selectedItems,
  onSelectionChange,
  projectStartTime,
  projectEndTime,
  lang,
  t,
}: {
  selectedItems: Array<{ inventory_item_id: number; quantity_requested: number; expected_return_date?: string; item?: any }>;
  onSelectionChange: (items: Array<{ inventory_item_id: number; quantity_requested: number; expected_return_date?: string; item?: any }>) => void;
  projectStartTime?: string;
  projectEndTime?: string;
  lang: Language;
  t: (k: string) => string;
}) {
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showBrowser, setShowBrowser] = useState(false);

  async function loadInventory() {
    try {
      setLoading(true);
      const response = await apiClient.get('/inventory', { search, in_stock_only: true, active_only: true, per_page: 50 });
      if (response.data) setAvailableItems(response.data as any);
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  }

  function addItem(item: any) {
    const existing = selectedItems.find(si => si.inventory_item_id === item.id);
    if (existing) return;
    onSelectionChange([...selectedItems, {
      inventory_item_id: Number(item.id),
      quantity_requested: 1,
      expected_return_date: projectEndTime?.split('T')[0],
      item,
    }]);
  }

  function removeItem(itemId: number) {
    onSelectionChange(selectedItems.filter(si => si.inventory_item_id !== itemId));
  }

  function updateQuantity(itemId: number, quantity: number) {
    onSelectionChange(selectedItems.map(si =>
      si.inventory_item_id === itemId ? { ...si, quantity_requested: quantity } : si
    ));
  }

  function updateReturnDate(itemId: number, date: string) {
    onSelectionChange(selectedItems.map(si =>
      si.inventory_item_id === itemId ? { ...si, expected_return_date: date } : si
    ));
  }

  return (
    <div className="space-y-3">
      {!showBrowser ? (
        <button
          type="button"
          onClick={() => { setShowBrowser(true); loadInventory(); }}
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary inline-flex items-center gap-2"
        >
          <span className="font-bold text-lg">+</span>
          <span>{t("browseInventory")}</span>
        </button>
      ) : (
        <div className="space-y-3 rounded-lg border border-border bg-background p-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={t("searchInventoryPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={loadInventory}
              className="rounded-md bg-warning px-3 py-2 text-sm font-medium text-warning-foreground hover:bg-warning/90"
            >
              {t("searchAction")}
            </button>
            <button
              type="button"
              onClick={() => setShowBrowser(false)}
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"
            >
              {t("close")}
            </button>
          </div>
          {loading ? (
            <div className="text-sm text-subtext">{t("loading")}</div>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded border border-border">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold">Item</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">Available</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {availableItems.map((item) => {
                    const isSelected = selectedItems.some(si => si.inventory_item_id === item.id);
                    return (
                      <tr key={item.id} className={isSelected ? 'bg-muted/30' : ''}>
                        <td className="px-3 py-2 text-sm">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-subtext">{item.code}</div>
                        </td>
                        <td className="px-3 py-2 text-sm">{item.available_quantity} {item.unit}</td>
                        <td className="px-3 py-2">
                          {isSelected ? (
                            <span className="text-xs text-green-600 font-medium">✓ Selected</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addItem(item)}
                              className="rounded-md bg-warning px-3 py-1 text-xs font-medium text-warning-foreground hover:bg-warning/90"
                            >
                              Add
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {availableItems.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-6 text-center text-sm text-subtext">No items found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selectedItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Selected Items ({selectedItems.length})</h4>
          {selectedItems.map((selected) => {
            const item = selected.item || availableItems.find(ai => ai.id === selected.inventory_item_id);
            if (!item) return null;
            return (
              <div key={selected.inventory_item_id} className="flex flex-col sm:flex-row gap-3 rounded-lg border border-border bg-background p-3">
                <div className="flex-1">
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs text-subtext">Available: {item.available_quantity} {item.unit}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={item.available_quantity}
                    value={selected.quantity_requested}
                    onChange={(e) => updateQuantity(selected.inventory_item_id, parseInt(e.target.value) || 1)}
                    className="w-20 rounded-md border border-border bg-card px-2 py-1 text-sm"
                  />
                  <input
                    type="date"
                    value={selected.expected_return_date || ''}
                    onChange={(e) => updateReturnDate(selected.inventory_item_id, e.target.value)}
                    min={projectStartTime?.split('T')[0]}
                    className="rounded-md border border-border bg-card px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(selected.inventory_item_id)}
                    className="rounded-md border border-border px-2 py-1 text-sm hover:bg-secondary"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Toasts
type ToastKind = "success" | "error" | "info";
type Toast = { id: string; kind: ToastKind; message: string };

function ToastItem({ t, toast, onClose }: { t: (k: string) => string; toast: Toast; onClose: (id: string) => void }) {
  const kindStyles =
    toast.kind === "success"
      ? "bg-green-600 text-white"
      : toast.kind === "error"
      ? "bg-red-600 text-white"
      : "bg-blue-600 text-white";
  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      className={`pointer-events-auto flex items-start gap-3 rounded-md px-4 py-3 shadow-lg ${kindStyles}`}
    >
      <div className="text-sm">{toast.message}</div>
      <button onClick={() => onClose(toast.id)} className="ms-auto text-white/80 hover:text-white">×</button>
    </div>
  );
}

function ToastContainer({ t, toasts, onClose }: { t: (k: string) => string; toasts: Toast[]; onClose: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} t={t} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

function Navbar({
  t,
  language,
  onToggleLanguage,
  currentUser,
  onLogout,
}: {
  t: (k: string) => string;
  language: Language;
  onToggleLanguage: () => void;
  currentUser: User;
  onLogout: () => void;
}) {
  return (
  <header className="border-b bg-gradient-to-r from-warning via-warning/95 to-warning/90 text-warning-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-warning-foreground/15 text-warning-foreground grid place-items-center font-extrabold shadow-sm">A</div>
            <span className="text-xl md:text-2xl font-bold tracking-tight text-warning-foreground">{t("appTitle")}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm md:text-base text-warning-foreground/90 hidden sm:inline font-medium">
              {currentUser.name} • {t(currentUser.role)}
            </span>
            <button
              onClick={onToggleLanguage}
              className="inline-flex items-center gap-2 rounded-lg border border-warning-foreground/30 px-3 py-1.5 text-sm font-semibold text-warning-foreground shadow-sm hover:bg-warning-foreground/10 active:bg-warning-foreground/15 transition-all duration-200 hover:scale-105"
              aria-label={t("language")}
            >
              <span>{language === "en" ? t("arabic") : t("english")}</span>
            </button>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-lg bg-warning-foreground px-3 py-1.5 text-sm font-semibold text-warning shadow-sm hover:bg-warning-foreground/90 active:bg-warning-foreground/80 transition-all duration-200 hover:scale-105"
            >
              {t("logout")}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function LoginView({
  t,
  language,
  onLogin,
  notifyError,
}: {
  t: (k: string) => string;
  language: Language;
  onLogin: (user: User) => void;
  notifyError: (message: string) => void;
}) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isAr = language === "ar";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier || !password) return;
    setSubmitting(true);
    try {
      const res = await authService.login({ email: identifier, password });
  const first = res.user.first_name ?? "";
  const last = res.user.last_name ?? "";
  const fullName = `${first} ${last}`.trim();
  const displayName = res.user.name ? res.user.name : (fullName.length > 0 ? fullName : res.user.email);
      const uiUser: User = {
        id: res.user.id,
        name: displayName,
        role: mapApiRoleToUi(res.user.role),
        apiRole: ["USER","DIRECT_MANAGER","ACCOUNTANT","ADMIN","FINAL_MANAGER"].includes(res.user.role) ? (res.user.role as User["apiRole"]) : undefined,
      };
      onLogin(uiUser);
      // Optionally persist a token marker for this SPA
      localStorage.setItem(LS_KEYS.token, res.token);
    } catch (err) {
      // You can add UI error state/toast here as needed
      console.error("Login failed", err);
      let message = "Login failed";
      const anyErr: any = err;
      if (anyErr?.response?.data?.message) message = anyErr.response.data.message;
      else if (anyErr?.message) message = anyErr.message;
      notifyError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
  <div className={clsx("min-h-screen grid place-items-center bg-gradient-to-br from-background to-secondary/30", isAr && "text-right")}> 
  <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
        <div className="mb-6">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-warning grid place-items-center font-extrabold text-white text-2xl shadow-lg mb-4 mx-auto">A</div>
          <h1 className="text-2xl font-bold tracking-tight text-center">{t("loginTitle")}</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-bold text-primary">
              {t("emailOrUsername")}
            </label>
            <input
              type="text"
              placeholder="your.email@example.com"
              className="w-full rounded-lg border-2 border-border bg-background px-4 py-3 text-sm font-medium shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              dir={isAr ? "rtl" : "ltr"}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-primary">{t("password")}</label>
            <input
              type="password"
              placeholder="Enter your password"
              className="w-full rounded-lg border-2 border-border bg-background px-4 py-3 text-sm font-medium shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir={isAr ? "rtl" : "ltr"}
            />
          </div>
          <div className="pt-2">
            {(!identifier || !password) && (
              <p className="text-xs text-red-600 font-semibold mb-3 text-center">⚠ Please enter both email and password</p>
            )}
            <button
              type="submit"
              disabled={!identifier || !password || submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-warning to-warning/90 px-6 py-3 text-base font-bold text-warning-foreground shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 transition-all duration-200 hover:scale-105"
            >
              {submitting && (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {submitting ? t("loading") : t("login")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RequestCard({
  pr,
  selected,
  onClick,
  t,
  lang,
  isChecked,
  onToggleCheck,
}: {
  pr: PurchaseRequest;
  selected: boolean;
  onClick: () => void;
  t: (k: string) => string;
  lang: Language;
  isChecked?: boolean;
  onToggleCheck?: (id: string) => void;
}) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved": return "✓";
      case "Rejected": return "✗";
      case "Pending": return "⏳";
      case "Paid": return "💰";
      case "Done": return "✓✓";
      default: return "📄";
    }
  };

  return (
    <div
      className={clsx(
        "w-full rounded-lg border p-3 shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.01] relative",
        "border-border bg-card",
        selected && "ring-2 ring-warning border-warning bg-warning/5"
      )}
    >
      <div className="flex items-start gap-3">
        {onToggleCheck && (
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => {
              e.stopPropagation();
              onToggleCheck(pr.id);
            }}
            className="mt-1 h-4 w-4 rounded border-border accent-warning cursor-pointer"
          />
        )}
        <button
          onClick={onClick}
          className="flex-1 text-start min-w-0"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-foreground flex items-center gap-2">
                {pr.type === "project" && <FolderPlus className="h-4 w-4 text-primary inline" />}
                {pr.title}
              </div>
              <div className="mt-1 text-xs truncate">
                <span className="font-semibold text-primary">{t("requester")}:</span> <span className="text-foreground">{pr.requester}</span>
              </div>
              <div className="mt-0.5 text-xs">
                <span className="font-semibold text-primary">{t("submitted")}:</span> <span className="text-subtext">{new Date(pr.submittedDate).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")}</span>
              </div>
              <div className="mt-1 text-xs font-semibold text-primary">
                {formatCurrency(pr.totalEstimatedCost, lang)}
              </div>
            </div>
            <span
              className={clsx(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ring-1 shadow-md flex items-center gap-1",
                statusBadgeColor(pr.status)
              )}
            >
              <span>{getStatusIcon(pr.status)}</span>
              <span>{pr.status}</span>
            </span>
          </div>
        </button>
      </div>
    </div>
  );
}

function RequestDetailView({
  pr,
  t,
  lang,
  currentUser,
  onApprove,
  onReject,
  onSubmitQuotation,
  onUploadQuoteUrl,
  onSelectQuote,
  onSubmitDraft,
  onMarkProjectDone,
  onConfirmClientPaid,
}: {
  pr: PurchaseRequest;
  t: (k: string) => string;
  lang: Language;
  currentUser: User;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  onSubmitQuotation: (id: string, quotation: string) => Promise<void>;
  onUploadQuoteUrl: (id: string, quote: { vendorName: string; quoteTotal: number; fileUrl: string; notes?: string }) => Promise<void>;
  onSelectQuote: (id: string, quoteId?: string | number) => Promise<void>;
  onSubmitDraft: (id: string) => Promise<void>;
  onMarkProjectDone: (id: string) => Promise<void>;
  onConfirmClientPaid: (id: string, payoutRef?: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [quotation, setQuotation] = useState(pr.quotations ?? "");
  const [newQuoteUrl, setNewQuoteUrl] = useState("");
  const [newQuoteVendor, setNewQuoteVendor] = useState("");
  const [newQuoteTotal, setNewQuoteTotal] = useState<string>("");
  const [newQuoteNotes, setNewQuoteNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  // Comments state
  const [comments, setComments] = useState<Array<{ id: number; author: string; author_id: number; content: string; created_at: string }>>([]);
  const [newComment, setNewComment] = useState<string>("");
  const [isLoadingComments, setIsLoadingComments] = useState<boolean>(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [comments]);
  const isAr = lang === 'ar';
  const isAccountant = currentUser.role === "accountant";
  const apiRole = currentUser.apiRole;
  const assumeUnknownManager = currentUser.role === 'manager' && !apiRole;
  const isAdmin = apiRole === 'ADMIN';
  // If manager role is unknown, allow DM actions for purchases and FM actions for projects by context
  const isDM = apiRole === 'DIRECT_MANAGER' || apiRole === 'ADMIN' || (assumeUnknownManager && pr.type !== 'project');
  const isFinalManager = apiRole === 'FINAL_MANAGER' || apiRole === 'ADMIN' || (assumeUnknownManager && pr.type === 'project');
  const canDMAct = isDM && pr.rawState === 'SUBMITTED' && pr.type !== 'project';
  const canAccountantAddQuotes = isAccountant && pr.rawState === 'DM_APPROVED';
  const canFinalManagerPurchase = isFinalManager && pr.type !== 'project' && pr.rawState === 'DM_APPROVED' && pr.quotes && pr.quotes.length > 0;
  const canFinalManagerProject = isFinalManager && pr.type === 'project' && pr.rawState === 'SUBMITTED';
  const canSubmitDraft = pr.rawState === 'DRAFT' && (currentUser.id === pr.requesterId || isDM);
  const canRequesterMarkDone = pr.type === 'project' && pr.rawState === 'PROCESSING' && String(currentUser.id) === String(pr.requesterId);
  const canAccountantConfirmPaid = isAccountant && pr.type === 'project' && pr.rawState === 'DONE';

  const hasAnyActionVisible = canDMAct || canFinalManagerPurchase || canFinalManagerProject || canAccountantAddQuotes || canRequesterMarkDone || canAccountantConfirmPaid || canSubmitDraft;

  function computeActionHint(): string | null {
    const st = pr.rawState;
    if (pr.type === 'project') {
      if (isFinalManager) {
        if (st === 'SUBMITTED') return t('hintFmProjectApproveReject');
        return t('hintFmProjectNoAction');
      }
      if (String(currentUser.id) === String(pr.requesterId)) {
        if (st === 'PROCESSING') return t('hintRequesterMarkDone');
        if (st === 'DONE') return t('hintRequesterAwaitingPaid');
        if (st === 'SUBMITTED') return t('hintRequesterAwaitingFm');
      }
      if (isAccountant) {
        if (st === 'DONE') return t('hintAccountantConfirmPaid');
        return t('hintAccountantProjectWait');
      }
      return t('noActionsGeneric');
    }
    // Purchases
    if (isDM) {
      if (st === 'SUBMITTED') return t('hintDmApproveReject');
      return t('hintDmNoAction');
    }
    if (isAccountant) {
      if (st === 'DM_APPROVED') {
        if (!pr.quotes || pr.quotes.length === 0) return t('hintAcctAddQuotes');
        return t('hintAcctAddMoreOrWaitFm');
      }
      return t('hintAccountantPurchaseWait');
    }
    if (isFinalManager) {
      if (st === 'DM_APPROVED') {
        if (!pr.quotes || pr.quotes.length === 0) return t('finalManagerWaitingQuotes');
        if (!pr.selectedQuoteId) return t('finalManagerSelectQuote');
        return t('hintFmCanApproveNow');
      }
      return t('hintFmNoActionPurchase');
    }
    return t('noActionsGeneric');
  }

  async function handleApprove() {
    setBusy("approve");
    await onApprove(pr.id);
    setBusy(null);
  }
  async function handleReject() {
    if (!reason.trim()) return;
    setBusy("reject");
    await onReject(pr.id, reason.trim());
    setBusy(null);
  }
  async function handleQuotation() {
    if (!quotation.trim()) return;
    setBusy("quotation");
    await onSubmitQuotation(pr.id, quotation.trim());
    setBusy(null);
  }
  async function handleUploadQuote() {
    if (!newQuoteVendor.trim() || !newQuoteUrl.trim() || !newQuoteTotal) return;
    setBusy("uploadQuote");
    await onUploadQuoteUrl(pr.id, {
      vendorName: newQuoteVendor.trim(),
      quoteTotal: Number(newQuoteTotal) || 0,
      fileUrl: newQuoteUrl.trim(),
      notes: newQuoteNotes.trim() || undefined,
    });
    setBusy(null);
    setNewQuoteVendor("");
    setNewQuoteUrl("");
    setNewQuoteTotal("");
    setNewQuoteNotes("");
  }
  async function handleSelectQuote(qid?: string | number) {
    setBusy("selectQuote");
    await onSelectQuote(pr.id, qid);
    setBusy(null);
  }

  async function handleAdminDelete() {
    if (!isAdmin) return;
    if (!window.confirm(t('deleteConfirm'))) return;
    try {
      await adminApi.deleteRequest(pr.id);
      // Optimistic UI: remove from lists
      // We'll dispatch a custom event; parent listens and removes
      const ev = new CustomEvent('app:request-deleted', { detail: { id: pr.id } });
      window.dispatchEvent(ev);
    } catch (e) {
      console.error('Admin delete failed', e);
      alert('Delete failed');
    }
  }

  // Load comments and poll periodically for near real-time updates
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoadingComments(true);
        setCommentsError(null);
        const resp = await requestsApi.getComments(pr.id);
        if (mounted && resp.data) setComments(resp.data);
      } catch (e) {
        if (mounted) setCommentsError((e as any)?.message || 'Failed to load comments');
      } finally {
        if (mounted) setIsLoadingComments(false);
      }
    })();
    return () => { mounted = false; };
  }, [pr.id]);

  async function postComment() {
    const content = newComment.trim();
    if (!content) return;
    setBusy('postComment');
    try {
      await requestsApi.addComment(pr.id, { content });
      setNewComment("");
      const resp = await requestsApi.getComments(pr.id);
      if (resp.data) setComments(resp.data);
    } catch (e) {
      // Could toast an error
    } finally {
      setBusy(null);
    }
  }

  function onCommentKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (newComment.trim() && busy !== 'postComment') postComment();
    }
  }

  return (
    <div className="space-y-6">
      {/* Information card */}
  <section className="rounded-xl border border-border bg-card/90 p-3 md:p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 md:gap-3">
          {lang === 'ar' ? (
            <>
              <span className={clsx("rounded-full px-2 py-0.5 text-xs font-semibold ring-1", statusBadgeColor(pr.status))}>{pr.status}</span>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">{t("information")}</h2>
            </>
          ) : (
            <>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">{t("information")}</h2>
              <span className={clsx("rounded-full px-2 py-0.5 text-xs font-semibold ring-1", statusBadgeColor(pr.status))}>{pr.status}</span>
            </>
          )}
         </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="text-sm text-subtext">{t("title")}</div>
            <div className="text-sm font-medium">{pr.title}</div>
          </div>
          <div>
            <div className="text-sm text-subtext">{t("requester")}</div>
            <div className="text-sm font-medium">{pr.requester}</div>
          </div>
          <div>
            <div className="text-sm text-subtext">{t("directManager")}</div>
            <div className="text-sm font-medium">{pr.directManagerName || (pr.directManagerId ? `#${pr.directManagerId}` : '—')}</div>
          </div>
          <div>
            <div className="text-sm text-subtext">{t("submitted")}</div>
            <div className="text-sm font-medium">{new Date(pr.submittedDate).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}</div>
          </div>
          <div>
            <div className="text-sm text-subtext">{t("totalEstimatedCost")}</div>
            <div className="text-sm font-medium">{formatCurrency(pr.totalEstimatedCost, lang)}</div>
          </div>
          {pr.type === 'project' && (
            <>
              {pr.clientName && (
                <div>
                  <div className="text-xs font-semibold text-primary uppercase tracking-wide">{t("clientName")}</div>
                  <div className="text-sm font-bold text-foreground">{pr.clientName}</div>
                </div>
              )}
              {pr.location && (
                <div>
                  <div className="text-xs font-semibold text-primary uppercase tracking-wide">{t("location")}</div>
                  <div className="text-sm font-bold text-foreground">{pr.location}</div>
                </div>
              )}
              {pr.startTime && (
                <div>
                  <div className="text-xs font-semibold text-primary uppercase tracking-wide">{t("startTime")}</div>
                  <div className="text-sm font-bold text-foreground">{new Date(pr.startTime).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</div>
                </div>
              )}
              {pr.endTime && (
                <div>
                  <div className="text-xs font-semibold text-primary uppercase tracking-wide">{t("endTime")}</div>
                  <div className="text-sm font-bold text-foreground">{new Date(pr.endTime).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</div>
                </div>
              )}
              {typeof pr.totalCost === 'number' && (
                <div>
                  <div className="text-xs font-semibold text-primary uppercase tracking-wide">{t("totalCost")}</div>
                  <div className="text-base font-bold text-warning">{formatCurrency(pr.totalCost, lang)}</div>
                </div>
              )}
              {typeof pr.totalBenefit === 'number' && (
                <div>
                  <div className="text-xs font-semibold text-primary uppercase tracking-wide">{t("totalBenefit")}</div>
                  <div className="text-base font-bold text-success">{formatCurrency(pr.totalBenefit, lang)}</div>
                </div>
              )}
              {typeof pr.totalPrice === 'number' && (
                <div>
                  <div className="text-xs font-semibold text-primary uppercase tracking-wide">{t("totalPrice")}</div>
                  <div className="text-base font-bold text-warning">{formatCurrency(pr.totalPrice, lang)}</div>
                </div>
              )}
              {pr.activeFrom && (
                <div>
                  <div className="text-xs font-semibold text-primary uppercase tracking-wide">{t("activeFrom")}</div>
                  <div className="text-sm font-bold text-foreground">{new Date(pr.activeFrom).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="mt-4">
          <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">{t("description")}</div>
          <p className="text-sm leading-6 text-foreground">{pr.description}</p>
        </div>
        <div className="mt-3 md:mt-4">
          <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">{t("items")}</div>
          <div className="overflow-x-auto overflow-hidden rounded-lg border border-border shadow-sm">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-gradient-to-r from-primary/10 via-warning/10 to-primary/10">
                <tr>
                  <th className="px-2 md:px-3 py-2 md:py-3 text-start text-xs md:text-sm font-bold uppercase tracking-wider text-primary">{t("item")}</th>
                  <th className="px-2 md:px-3 py-2 md:py-3 text-start text-xs md:text-sm font-bold uppercase tracking-wider text-primary">{t("quantity")}</th>
                  <th className="px-2 md:px-3 py-2 md:py-3 text-start text-xs md:text-sm font-bold uppercase tracking-wider text-primary">{t("estimatedCost")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {pr.items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-foreground">{it.name}</td>
                    <td className="px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-semibold text-foreground">{it.quantity}</td>
                    <td className="px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-bold text-warning">{formatCurrency(it.estimatedCost, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      

  <section className="rounded-xl border border-border bg-card/90 p-3 md:p-4 lg:p-5 shadow-sm">
        <h2 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight text-primary">{t("workflowHistory")}</h2>
        <ol className="mt-3 md:mt-4 space-y-2 md:space-y-3">
          <li className="text-sm">
            • {t("createdBy")} {pr.requester} — {new Date(pr.submittedDate).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
          </li>
          {pr.status === "Awaiting Payment" && (
            <li className="text-sm">• {t("dmApprovedWaiting")}</li>
          )}
          {pr.status === "Awaiting Selection" && (
            <>
              <li className="text-sm">• {t("approvedBy")} Direct Manager</li>
              <li className="text-sm">• {t("quotesAddedWaiting")}</li>
            </>
          )}
          {pr.status === "Approved" && (
            <>
              <li className="text-sm">• {t("approvedBy")} Direct Manager</li>
              <li className="text-sm">• {t("approvedBy")} Final Manager</li>
            </>
          )}
          {pr.status === 'Processing' && (
            <>
              <li className="text-sm">• {t("approvedBy")} Final Manager</li>
              <li className="text-sm">• {t("processing")}</li>
            </>
          )}
          {pr.status === 'Done' && (
            <>
              <li className="text-sm">• {t("done")}</li>
            </>
          )}
          {pr.status === 'Paid' && (
            <>
              <li className="text-sm">• {t("paid")}</li>
            </>
          )}
          {pr.status === "Active" && (
            <>
              <li className="text-sm">• {t("approvedBy")} Direct Manager</li>
              <li className="text-sm">• {t("approvedBy")} Final Manager</li>
              <li className="text-sm">• {t("projectActive")}</li>
            </>
          )}
          {pr.status === "Rejected" && (
            <li className="text-sm">
              • {t("rejectedBy")} Manager
              {pr.rejectionReason && ` — ${pr.rejectionReason}`}
            </li>
          )}
          {pr.status === "Processed" && (
            <>
              <li className="text-sm">• {t("approvedBy")} Direct Manager</li>
              <li className="text-sm">• {t("approvedBy")} Final Manager</li>
              <li className="text-sm">• {t("processedBy")}</li>
            </>
          )}
        </ol>
      </section>

          {/* Quotes section visible to everyone */}
  <section className="rounded-xl border border-border bg-card/90 p-3 md:p-4 lg:p-5 shadow-sm">
        <h2 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight">{t("quotes")}</h2>
         {(!pr.quotes || pr.quotes.length === 0) ? (
           <p className="mt-2 text-sm text-subtext">{t("noQuotesYet")}</p>
         ) : (
           <div className="mt-2 md:mt-3 overflow-x-auto overflow-hidden rounded-lg border border-border">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-warning/20">
                 <tr>
                  <th className="px-2 md:px-3 py-1.5 md:py-2 text-start text-xs md:text-sm font-semibold uppercase tracking-wider text-foreground">Vendor</th>
                  <th className="px-2 md:px-3 py-1.5 md:py-2 text-start text-xs md:text-sm font-semibold uppercase tracking-wider text-foreground">Total</th>
                  <th className="px-2 md:px-3 py-1.5 md:py-2 text-start text-xs md:text-sm font-semibold uppercase tracking-wider text-foreground">File</th>
                  <th className="px-2 md:px-3 py-1.5 md:py-2 text-start text-xs md:text-sm font-semibold uppercase tracking-wider text-foreground">Select</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-border bg-card/90">
                {pr.quotes?.map((q) => (
                  <tr key={String(q.id)} className="text-xs md:text-sm">
                    <td className="px-2 md:px-3 py-1.5 md:py-2">{q.vendorName}</td>
                    <td className="px-2 md:px-3 py-1.5 md:py-2">{formatCurrency(q.quoteTotal, lang)}</td>
                    <td className="px-2 md:px-3 py-1.5 md:py-2">
                      {q.fileUrl ? (
                        <a href={q.fileUrl} target="_blank" className="text-primary hover:underline">View</a>
                      ) : (
                        <span className="text-subtext">—</span>
                      )}
                    </td>
                    <td className="px-2 md:px-3 py-1.5 md:py-2">
                      <button
                        disabled={!isFinalManager || busy === "selectQuote" || pr.rawState !== 'DM_APPROVED'}
                        onClick={() => handleSelectQuote(q.id)}
                        className={clsx(
                          "rounded-md border px-1.5 md:px-2 py-0.5 md:py-1 text-xs",
                          pr.selectedQuoteId === q.id ? "bg-warning text-warning-foreground border-warning" : "border-border hover:bg-secondary"
                        )}
                      >
                        {pr.selectedQuoteId === q.id ? "Selected" : "Select"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {canAccountantAddQuotes && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-2 md:gap-3 md:grid-cols-2 lg:grid-cols-4">
              <input
                placeholder="Vendor name"
                value={newQuoteVendor}
                onChange={(e) => setNewQuoteVendor(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Quote total"
                value={newQuoteTotal}
                onChange={(e) => setNewQuoteTotal(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20"
              />
              <input
                placeholder="Quote file URL"
                value={newQuoteUrl}
                onChange={(e) => setNewQuoteUrl(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20"
              />
              <input
                placeholder="Notes (optional)"
                value={newQuoteNotes}
                onChange={(e) => setNewQuoteNotes(e.target.value)}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20"
              />
            </div>
            <div>
              <button
                onClick={handleUploadQuote}
                disabled={busy === "uploadQuote" || !newQuoteVendor || !newQuoteUrl || !newQuoteTotal}
                className="rounded-md bg-warning px-4 py-2 text-sm font-medium text-warning-foreground shadow-sm hover:bg-warning/90 disabled:opacity-60"
              >
                {busy === "uploadQuote" ? "..." : "Add Quote"}
              </button>
            </div>
          </div>
        )}
        
        {/* Show message when accountant needs to wait for DM approval */}
        {isAccountant && pr.rawState !== 'DM_APPROVED' && pr.rawState !== 'DRAFT' && (
          <div className="mt-4">
            <p className="text-sm text-subtext">
              {pr.rawState === 'SUBMITTED' ? t('quotesWaitingHint') : t('quotesStateHint')}
            </p>
          </div>
        )}
      </section>

      

  <section className="rounded-xl border border-border bg-card/90 p-3 md:p-4 lg:p-5 shadow-sm">
  <h2 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight">{t("actions")}</h2>
        <div className="mt-3 md:mt-4 space-y-2 md:space-y-3">
          {isAdmin && (
            <div className="flex">
              <button
                onClick={handleAdminDelete}
                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-red-700 transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                {t('deleteRequest')}
              </button>
            </div>
          )}
          {canDMAct && (
            <div className="flex flex-col gap-2 md:gap-3 sm:flex-row sm:items-center">
              <button
                onClick={handleApprove}
                disabled={busy === "approve"}
                className="inline-flex items-center justify-center rounded-lg bg-warning px-3 md:px-4 py-1.5 md:py-2 text-sm font-semibold text-warning-foreground shadow-md hover:bg-warning/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                {busy === "approve" ? "..." : t("approve")}
              </button>
              <div className="flex-1">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("rejectionReason")}
                  className="w-full rounded-lg border border-border bg-background px-2 md:px-3 py-1.5 md:py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200"
                />
              </div>
              <button
                onClick={handleReject}
                disabled={!reason.trim() || busy === "reject"}
                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 md:px-4 py-1.5 md:py-2 text-sm font-semibold text-white shadow-md hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                {busy === "reject" ? "..." : t("reject")}
              </button>
            </div>
          )}

          {(canFinalManagerPurchase || canFinalManagerProject) && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={handleApprove}
                disabled={busy === "approve" || (canFinalManagerPurchase && !pr.selectedQuoteId)}
                className="inline-flex items-center justify-center rounded-lg bg-warning px-4 py-2 text-sm font-semibold text-warning-foreground shadow-md hover:bg-warning/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                {busy === "approve" ? "..." : t("approve")}
              </button>
              {canFinalManagerProject && (
                <>
                  <div className="flex-1">
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={t("rejectionReason")}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200"
                    />
                  </div>
                  <button
                    onClick={handleReject}
                    disabled={!reason.trim() || busy === "reject"}
                    className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 hover:shadow-lg"
                  >
                    {busy === "reject" ? "..." : t("reject")}
                  </button>
                </>
              )}
            </div>
          )}

          {/* No final manager stage */}

          {/* Contextual hint when no actions are available */}
          {!hasAnyActionVisible && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-800 font-medium">{computeActionHint()}</p>
              </div>
            </div>
          )}

          {canRequesterMarkDone && (
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => onMarkProjectDone(pr.id)}
                className="inline-flex items-center justify-center rounded-lg bg-warning px-3 md:px-4 py-1.5 md:py-2 text-sm font-semibold text-warning-foreground shadow-md hover:bg-warning/90 transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                {t('markProjectDone')}
              </button>
            </div>
          )}

          {canAccountantConfirmPaid && (
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => onConfirmClientPaid(pr.id)}
                className="inline-flex items-center justify-center rounded-lg bg-warning px-3 md:px-4 py-1.5 md:py-2 text-sm font-semibold text-warning-foreground shadow-md hover:bg-warning/90 transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                {t('confirmClientPaid')}
              </button>
            </div>
          )}

          {/* Submit draft for approval (requester/manager/admin) */}
          {canSubmitDraft && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onSubmitDraft(pr.id)}
                className="inline-flex items-center justify-center rounded-lg bg-warning px-4 py-2 text-sm font-semibold text-warning-foreground shadow-md hover:bg-warning/90 transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                {t('submitRequest')}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// Standalone Comments Panel to embed as a grid column
function CommentsPanel({ prId, lang, t }: { prId: string; lang: Language; t: (k: string) => string }) {
  const [comments, setComments] = useState<Array<{ id: number; author: string; author_id: number; content: string; created_at: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const sorted = useMemo(() => [...comments].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()), [comments]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const resp = await requestsApi.getComments(prId);
        if (mounted && resp.data) setComments(resp.data);
      } catch (e) {
        if (mounted) setError((e as any)?.message || 'Failed to load comments');
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [prId]);

  async function refresh() {
    try {
      setIsLoading(true);
      setError(null);
      const resp = await requestsApi.getComments(prId);
      if (resp.data) setComments(resp.data);
    } catch (e) {
      setError((e as any)?.message || 'Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  }

  async function post() {
    const content = newComment.trim();
    if (!content) return;
    setPosting(true);
    try {
      await requestsApi.addComment(prId, { content });
      setNewComment("");
      const resp = await requestsApi.getComments(prId);
      if (resp.data) setComments(resp.data);
    } finally {
      setPosting(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (newComment.trim() && !posting) post();
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card/90 p-3 md:p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2 md:gap-3">
        {lang === 'ar' ? (
          <>
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-1.5 md:gap-2 rounded-md border border-border px-2 md:px-3 py-1 md:py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-60"
              disabled={isLoading}
            >
              {t('refresh')}
            </button>
            <h2 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight">{t("discussionComments")}</h2>
          </>
        ) : (
          <>
            <h2 className="text-lg md:text-xl lg:text-2xl font-bold tracking-tight">{t("discussionComments")}</h2>
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-1.5 md:gap-2 rounded-md border border-border px-2 md:px-3 py-1 md:py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-60"
              disabled={isLoading}
            >
              {t('refresh')}
            </button>
          </>
        )}
      </div>
      <div className="mt-2 md:mt-3 space-y-2 md:space-y-3 max-h-[50vh] md:max-h-[70vh] overflow-auto">
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-secondary" />
            <div className="h-16 animate-pulse rounded bg-secondary/70" />
          </div>
        ) : error ? (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            <div>{t('commentsLoadError')}</div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => setError(null)} className="rounded border border-red-300 px-2 py-1 text-xs hover:bg-red-100">
                {t('retry')}
              </button>
              <button onClick={refresh} className="rounded border border-red-300 px-2 py-1 text-xs hover:bg-red-100">
                {t('refresh')}
              </button>
            </div>
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-subtext">{t("noCommentsYet")}</p>
        ) : (
          sorted.map((c) => (
            <div key={c.id} className="rounded-md border border-border bg-background p-2 md:p-3">
              <div className="flex items-center justify-between text-xs text-subtext">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="grid h-5 w-5 md:h-6 md:w-6 place-items-center rounded-full bg-warning/20 text-[9px] md:text-[10px] font-bold text-warning-foreground">
                    {(c.author || ("User #" + c.author_id)).toString().trim().slice(0,2).toUpperCase()}
                  </div>
                  <span className="font-medium">{c.author || 'User #' + c.author_id}</span>
                </div>
                <span>{new Date(c.created_at).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
              </div>
              <div className="mt-2 text-sm whitespace-pre-wrap">{c.content}</div>
            </div>
          ))
        )}
      </div>
      <div className="mt-3 md:mt-4">
        <label className="mb-1.5 md:mb-2 block text-sm font-bold text-primary">{t("writeComment")}</label>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          placeholder="Share your thoughts or feedback..."
          onKeyDown={onKey}
          className="w-full rounded-lg border-2 border-border bg-background px-3 md:px-4 py-2 md:py-3 text-sm font-medium shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200"
          aria-label={t('writeComment')}
        />
        <div className="mt-2 md:mt-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-0">
          <div className="text-xs text-subtext font-medium">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-2 py-1 text-xs font-semibold bg-secondary rounded border border-border">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-2 py-1 text-xs font-semibold bg-secondary rounded border border-border">Enter</kbd>
              <span className="ml-1">to post quickly</span>
            </span>
          </div>
          <button
            onClick={post}
            disabled={posting || !newComment.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-warning px-5 py-2.5 text-sm font-bold text-warning-foreground shadow-md hover:bg-warning/90 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105"
          >
            {posting && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {posting ? t('posting') : t('post')}
          </button>
        </div>
      </div>
    </section>
  );
}

function RequestCreateForm({
  t,
  lang,
  onSubmit,
  onCancel,
}: {
  t: (k: string) => string;
  lang: Language;
  onSubmit: (data: Omit<PurchaseRequest, "id" | "status" | "submittedDate" | "requester" | "totalEstimatedCost"> & { items: PRItem[]; title: string; description: string; directManagerId?: number | string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<PRItem[]>([{ name: "", quantity: 1, estimatedCost: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [dmList, setDmList] = useState<Array<{ id: number | string; name?: string; first_name?: string; last_name?: string; email?: string }>>([]);
  const [dmLoading, setDmLoading] = useState<boolean>(false);
const [directManagerId, setDirectManagerId] = useState<string>("");

  const total = useMemo(() => items.reduce((sum, it) => sum + (Number(it.estimatedCost) || 0) * (Number(it.quantity) || 0), 0), [items]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setDmLoading(true);
  // Use non-admin endpoint to fetch direct managers to avoid 403 for regular users
  const res = await apiClient.get('/users/by-role', { per_page: 100, role: 'DIRECT_MANAGER' });
        const data = Array.isArray(res.data) ? res.data : [];
        if (mounted) setDmList(data as any);
      } catch (e) {
        // Non-fatal: keep optional
      } finally {
        if (mounted) setDmLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  function updateItem(idx: number, patch: Partial<PRItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { name: "", quantity: 1, estimatedCost: 0 }]);
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || items.length === 0) return;
    setSubmitting(true);
    const dm = directManagerId && directManagerId.toString().trim() !== "" ? directManagerId : undefined;
    await onSubmit({ title: title.trim(), description: description.trim(), items, directManagerId: dm });
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
  <section className="rounded-xl border border-border bg-card/90 p-5 shadow-sm">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">{t("details")}</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-subtext">{t("title")}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-subtext">{t("description")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-subtext">{t("directManager")}</label>
            <select
              value={directManagerId}
              onChange={(e) => setDirectManagerId(e.target.value)}
              className={clsx(
                "w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20"
              )}
            >
              <option value="">{dmLoading ? t('loading') : t('selectDirectManager')}</option>
              {dmList.map((u) => {
                const dn = (u as any).name || `${(u.first_name||'').toString()} ${(u.last_name||'').toString()}`.trim() || (u.email || `#${u.id}`);
                return (
                  <option key={String(u.id)} value={String(u.id)}>{dn}</option>
                );
              })}
            </select>
          </div>
        </div>
      </section>

  <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          {lang === 'ar' ? (
            <>
              <button type="button" onClick={addItem} className="inline-flex items-center gap-1.5 rounded-lg bg-warning px-4 py-2 text-sm font-bold text-warning-foreground hover:bg-warning/90 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Item
              </button>
              <div className="text-right">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-primary">{t("items")}</h2>
                <p className="text-xs text-subtext mt-1">Add items to your request (minimum 1 required)</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-primary">{t("items")}</h2>
                <p className="text-xs text-subtext mt-1">Add items to your request (minimum 1 required)</p>
              </div>
              <button type="button" onClick={addItem} className="inline-flex items-center gap-1.5 rounded-lg bg-warning px-4 py-2 text-sm font-bold text-warning-foreground hover:bg-warning/90 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Item
              </button>
            </>
          )}
         </div>
        <div className="mt-4 space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 p-2 md:p-3 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors">
              <input
                placeholder="Item name (e.g., Laptop, Office Chair)"
                value={it.name}
                onChange={(e) => updateItem(idx, { name: e.target.value })}
                className="md:col-span-5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200"
              />
              <input
                type="number"
                min={1}
                placeholder="Qty"
                value={it.quantity}
                onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) || 0 })}
                className="md:col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200"
              />
              <div className="md:col-span-4 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-subtext">SAR</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={it.estimatedCost}
                  onChange={(e) => updateItem(idx, { estimatedCost: Number(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background pl-12 pr-3 py-2 text-sm font-bold shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20 transition-colors duration-200"
                />
              </div>
              <div className="md:col-span-1 flex items-center justify-end">
                <button type="button" onClick={() => removeItem(idx)} className="w-full md:w-auto rounded-lg border border-red-200 bg-red-50 px-3 md:px-2 py-1.5 md:py-1 text-sm font-bold text-red-600 hover:bg-red-100 hover:border-red-300 transition-all duration-200" title="Remove item">
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-0 p-3 md:p-4 rounded-lg bg-gradient-to-r from-warning/10 to-primary/10 border border-warning/30">
          <div className="text-sm font-bold text-primary uppercase tracking-wide">{t("totalEstimatedCost")}</div>
          <div className="text-xl font-bold text-warning">{formatCurrency(total, lang)}</div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
        <div className="text-xs text-subtext">
          {!title.trim() && <span className="text-red-600 font-semibold">⚠ Title required</span>}
          {title.trim() && items.length === 0 && <span className="text-red-600 font-semibold">⚠ Add at least one item</span>}
          {title.trim() && items.length > 0 && !submitting && <span className="text-green-600 font-semibold">✓ Ready to submit</span>}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="rounded-lg border-2 border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary hover:border-primary transition-all duration-200">{t("cancel")}</button>
          <button
            type="submit"
            disabled={!title.trim() || items.length === 0 || submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-warning px-6 py-2.5 text-sm font-bold text-warning-foreground hover:bg-warning/90 disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
          >
            {submitting && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {submitting ? "Submitting..." : t("submitRequest")}
          </button>
        </div>
      </div>
    </form>
  );
}

function ProjectCreateForm({
  t,
  lang,
  onSubmit,
  onCancel,
}: {
  t: (k: string) => string;
  lang: Language;
  onSubmit: (data: {
    title: string;
    description: string;
    clientName: string;
    location: string;
    startTime: string;
    endTime: string;
    totalCost: number;
    totalBenefit: number;
    totalPrice: number;
    directManagerId?: number | string;
    items?: PRItem[];
    inventoryItems?: Array<{ inventory_item_id: number; quantity_requested: number; expected_return_date?: string }>;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [totalCost, setTotalCost] = useState<string>("");
  const [totalBenefit, setTotalBenefit] = useState<string>("");
  // Total price is auto-calculated as cost + benefit
  const computedTotalPrice = useMemo(() => {
    const c = Number(totalCost) || 0;
    const b = Number(totalBenefit) || 0;
    return c + b;
  }, [totalCost, totalBenefit]);
  const [items, setItems] = useState<PRItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Direct Manager selection
  const [dmList, setDmList] = useState<Array<{ id: number | string; name?: string; first_name?: string; last_name?: string; email?: string }>>([]);
  const [dmLoading, setDmLoading] = useState<boolean>(false);
  const [directManagerId, setDirectManagerId] = useState<string>("");
  // Inventory selection
  const [inventoryItems, setInventoryItems] = useState<Array<{ inventory_item_id: number; quantity_requested: number; expected_return_date?: string; item?: any }>>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setDmLoading(true);
        const res = await apiClient.get('/users/by-role', { per_page: 100, role: 'DIRECT_MANAGER' });
        const data = Array.isArray(res.data) ? res.data : [];
        if (mounted) setDmList(data as any);
      } catch (e) {
        // optional
      } finally {
        if (mounted) setDmLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Load all clients
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiClient.get('/visits/clients', { per_page: 1000 });
        const data = res.data || [];
        if (mounted) {
          setAllClients(data);
          setFilteredClients(data);
        }
      } catch (e) {
        console.error('Failed to load clients:', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Filter clients based on search
  useEffect(() => {
    if (clientSearch.trim() === '') {
      setFilteredClients(allClients);
    } else {
      const search = clientSearch.toLowerCase();
      const filtered = allClients.filter((client: any) => 
        client.store_name?.toLowerCase().includes(search) ||
        client.contact_person?.toLowerCase().includes(search) ||
        client.mobile?.includes(search)
      );
      setFilteredClients(filtered);
    }
  }, [clientSearch, allClients]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Required";
    // Allow either selected client or manually typed client name
    const finalClientName = selectedClient ? selectedClient.store_name : clientSearch.trim();
    if (!finalClientName) errs.clientName = "Required";
    if (!location.trim()) errs.location = "Required";
    if (!startTime) errs.startTime = "Required";
    if (!endTime) errs.endTime = "Required";
    const st = Date.parse(startTime);
    const et = Date.parse(endTime);
    if (startTime && endTime && isFinite(st) && isFinite(et) && et < st) {
      errs.endTime = "Must be after start";
    }
    if (totalCost === "" || Number(totalCost) < 0) errs.totalCost = "Required";
    if (totalBenefit === "" || Number(totalBenefit) < 0) errs.totalBenefit = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function addItem() {
    setItems((prev) => [...prev, { name: "", quantity: 1, estimatedCost: 0 }]);
  }
  function updateItem(idx: number, patch: Partial<PRItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    // Use selected client name or manually typed name
    const finalClientName = selectedClient ? selectedClient.store_name : clientSearch.trim();
    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      clientName: finalClientName,
      location: location.trim(),
      startTime,
      endTime,
      totalCost: Number(totalCost) || 0,
      totalBenefit: Number(totalBenefit) || 0,
      totalPrice: computedTotalPrice,
      directManagerId: (directManagerId && directManagerId.toString().trim() !== "") ? directManagerId : undefined,
      items,
      inventoryItems: inventoryItems.map(item => ({
        inventory_item_id: item.inventory_item_id,
        quantity_requested: item.quantity_requested,
        expected_return_date: item.expected_return_date,
      })),
    });
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <section className="rounded-xl border border-border bg-card/90 p-5 shadow-sm">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">{t("projectDetails")}</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-subtext">{t("title")}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={clsx("w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20", errors.title && "border-red-500")}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-subtext">{t("clientName")}</label>
            {selectedClient ? (
              <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{selectedClient.store_name}</div>
                  <div className="text-xs text-gray-600">{selectedClient.contact_person} • {selectedClient.mobile}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClient(null);
                    setClientName('');
                    setClientSearch('');
                    setShowClientDropdown(true);
                  }}
                  className="ml-2 text-xs text-blue-600 hover:text-blue-800 font-semibold"
                >
                  {t('change') || 'Change'}
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" style={{zIndex: 1}} />
                  <input
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setShowClientDropdown(true);
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                    placeholder={lang === 'ar' ? 'ابحث عن عميل أو اكتب اسم جديد...' : 'Search client or type new name...'}
                    className={clsx("w-full pl-10 pr-3 py-2 rounded-md border bg-background text-sm shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20", errors.clientName && "border-red-500")}
                    autoComplete="off"
                  />
                </div>
                
                {showClientDropdown && filteredClients.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full border rounded-lg shadow-lg bg-white max-h-60 overflow-y-auto">
                    <div className="sticky top-0 bg-gray-50 px-3 py-2 border-b flex justify-between items-center">
                      <span className="text-xs font-semibold text-gray-600">
                        {filteredClients.length} {lang === 'ar' ? 'عميل' : 'client(s)'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowClientDropdown(false)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        {lang === 'ar' ? 'إغلاق' : 'Close'}
                      </button>
                    </div>
                    {filteredClients.map((client: any) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          setSelectedClient(client);
                          setClientName(client.store_name);
                          setShowClientDropdown(false);
                          setClientSearch('');
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                      >
                        <div className="font-semibold text-sm text-gray-900">{client.store_name}</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {client.contact_person} • {client.mobile}
                        </div>
                        {client.business_type && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {lang === 'ar' ? client.business_type.name_ar : client.business_type.name_en}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-subtext">{t("description")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-primary uppercase tracking-wide">{t("location")}</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={clsx("w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20", errors.location && "border-red-500")}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-primary uppercase tracking-wide">{t("startTime")}</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={clsx("w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20", errors.startTime && "border-red-500")}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-primary uppercase tracking-wide">{t("endTime")}</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={clsx("w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20", errors.endTime && "border-red-500")}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-warning uppercase tracking-wide">{t("totalCost")}</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={totalCost}
              onChange={(e) => setTotalCost(e.target.value)}
              className={clsx("w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20", errors.totalCost && "border-red-500")}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-success uppercase tracking-wide">{t("totalBenefit")}</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={totalBenefit}
              onChange={(e) => setTotalBenefit(e.target.value)}
              className={clsx("w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20", errors.totalBenefit && "border-red-500")}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-warning uppercase tracking-wide">{t("totalPrice")}</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={computedTotalPrice.toString()}
              readOnly
              className={clsx("w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20", undefined)}
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          {lang === 'ar' ? (
            <>
              <button type="button" onClick={addItem} className="inline-flex items-center gap-1.5 rounded-lg bg-warning px-4 py-2 text-sm font-bold text-warning-foreground hover:bg-warning/90 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Item
              </button>
              <div className="text-right">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-primary">{t("items")}</h2>
                <p className="text-xs text-subtext mt-1">{t("optionalItemsHelp")}</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-primary">{t("items")}</h2>
                <p className="text-xs text-subtext mt-1">{t("optionalItemsHelp")}</p>
              </div>
              <button type="button" onClick={addItem} className="inline-flex items-center gap-1.5 rounded-lg bg-warning px-4 py-2 text-sm font-bold text-warning-foreground hover:bg-warning/90 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Item
              </button>
            </>
          )}
        </div>
        <div className="mt-4 space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-3 p-3 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors">
              <input
                placeholder="Item name (e.g., Scaffolding, Paint)"
                value={it.name}
                onChange={(e) => updateItem(idx, { name: e.target.value })}
                className="col-span-5 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200"
              />
              <input
                type="number"
                min={1}
                placeholder="Qty"
                value={it.quantity}
                onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) || 0 })}
                className="col-span-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200"
              />
              <div className="col-span-4 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-subtext">SAR</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={it.estimatedCost}
                  onChange={(e) => updateItem(idx, { estimatedCost: Number(e.target.value) || 0 })}
                  className="w-full rounded-lg border border-border bg-background pl-12 pr-3 py-2 text-sm font-bold shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20 transition-colors duration-200"
                />
              </div>
              <div className="col-span-1 flex items-center justify-end">
                <button type="button" onClick={() => removeItem(idx)} className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-sm font-bold text-red-600 hover:bg-red-100 hover:border-red-300 transition-all duration-200" title="Remove item">
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card/90 p-5 shadow-sm">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">{t("directManager")}</h2>
        <div className="mt-4">
          <select
            value={directManagerId}
            onChange={(e) => setDirectManagerId(e.target.value)}
            className={clsx(
              "w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20"
            )}
          >
            <option value="">{dmLoading ? t('loading') : t('selectDirectManager')}</option>
            {dmList.map((u) => {
              const dn = (u as any).name || `${(u.first_name||'').toString()} ${(u.last_name||'').toString()}`.trim() || (u.email || `#${u.id}`);
              return (
                <option key={String(u.id)} value={String(u.id)}>{dn}</option>
              );
            })}
          </select>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card/90 p-5 shadow-sm">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">{t("inventoryItemsOptional")}</h2>
        <p className="mt-2 text-sm text-subtext">{t("inventoryItemsHelp")}</p>
        <div className="mt-4">
          <InventorySelectionInline
            selectedItems={inventoryItems}
            onSelectionChange={setInventoryItems}
            projectStartTime={startTime}
            projectEndTime={endTime}
            lang={lang}
            t={t}
          />
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
        <div className="text-xs text-subtext">
          {Object.keys(errors).length > 0 && <span className="text-red-600 font-semibold">⚠ {Object.keys(errors).length} error(s) - check form fields</span>}
          {Object.keys(errors).length === 0 && !submitting && <span className="text-green-600 font-semibold">✓ Ready to submit</span>}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="rounded-lg border-2 border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary hover:border-primary transition-all duration-200">{t("cancel")}</button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-warning px-6 py-2.5 text-sm font-bold text-warning-foreground hover:bg-warning/90 disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
          >
            {submitting && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {submitting ? "Submitting..." : t("submitProject")}
          </button>
        </div>
      </div>
    </form>
  );
}

// ----------------------
// Main App
// ----------------------
function AdminCreateUserForm({ t, onCreated }: { t: (k: string) => string; onCreated: (user: any) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;
    try {
      setBusy(true);
      const resp = await adminApi.createUser({ name: name.trim(), email: email.trim(), password, role });
      if ((resp as any)?.data) onCreated((resp as any).data);
      setName(""); setEmail(""); setPassword(""); setRole("USER");
    } catch (e) {
      console.error('Create user failed', e);
      alert('Create failed');
    } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-bold text-primary uppercase tracking-wide">{t('userName')}</label>
        <input 
          value={name} 
          onChange={(e)=>setName(e.target.value)} 
          placeholder="Enter full name" 
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200" 
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-primary uppercase tracking-wide">{t('userEmail')}</label>
        <input 
          type="email"
          value={email} 
          onChange={(e)=>setEmail(e.target.value)} 
          placeholder="user@example.com" 
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200" 
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-warning uppercase tracking-wide">{t('userPassword')}</label>
        <input 
          type="password" 
          value={password} 
          onChange={(e)=>setPassword(e.target.value)} 
          placeholder="Min. 8 characters" 
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20 transition-colors duration-200" 
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-primary uppercase tracking-wide">Role</label>
        <select 
          value={role} 
          onChange={(e)=>setRole(e.target.value)} 
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200"
        >
          {['USER','DIRECT_MANAGER','ACCOUNTANT','FINAL_MANAGER','ADMIN','SALES_REP'].map(r => (
            <option key={r} value={r}>{r.replace('_', ' ')}</option>
          ))}
        </select>
      </div>
      <div className="pt-2">
        {!name.trim() || !email.trim() || !password ? (
          <p className="text-xs text-red-600 font-semibold mb-2">⚠ All fields are required</p>
        ) : (
          <p className="text-xs text-green-600 font-semibold mb-2">✓ Ready to create user</p>
        )}
        <button 
          type="submit" 
          disabled={busy || !name.trim() || !email.trim() || !password} 
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-warning px-4 py-2.5 text-sm font-bold text-warning-foreground hover:bg-warning/90 disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
        >
          {busy && (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {busy ? 'Creating...' : t('create')}
        </button>
      </div>
    </form>
  );
}

const App: React.FC = () => {
  // State
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem(LS_KEYS.lang) as Language) || "en");
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const raw = localStorage.getItem(LS_KEYS.user);
    return raw ? (JSON.parse(raw) as User) : null;
  });
  const [requests, setRequests] = useState<PurchaseRequest[]>(() => {
    const raw = localStorage.getItem(LS_KEYS.requests);
    return raw ? (JSON.parse(raw) as PurchaseRequest[]) : [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [view, setView] = useState<"detail" | "creating" | "creatingProject">("detail");
  const [section, setSection] = useState<"requests" | "inventory" | "admin" | "sales-visits">("requests");
  const [search, setSearch] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<Array<PurchaseRequest["status"]>>([]);
  const [filterRequester, setFilterRequester] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterMinCost, setFilterMinCost] = useState<string>("");
  const [filterMaxCost, setFilterMaxCost] = useState<string>("");
  const [filterAssignedToMe, setFilterAssignedToMe] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [adminUsers, setAdminUsers] = useState<Array<any>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: 'password123',
    role: 'USER',
    first_name: '',
    last_name: '',
    phone: '',
    position: ''
  });
  const [newUserErrors, setNewUserErrors] = useState<Record<string, string[]>>({});
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<"all" | "my" | "pending" | "thisWeek">("all");
  const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
  const [showDashboard, setShowDashboard] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string | number;
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
    read: boolean;
    created_at: string;
    related_request_id?: string | number;
  }>>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const unreadCount = Array.isArray(notifications) ? notifications.filter(n => !n.read).length : 0;

  const t = (key: string) => i18n[language][key] ?? key;

  function addToast(kind: ToastKind, message: string, timeoutMs = 3500) {
    const id = uid();
    const toast: Toast = { id, kind, message };
    setToasts((prev) => [...prev, toast]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, timeoutMs);
  }
  function toggleStatus(s: PurchaseRequest["status"]) {
    setFilterStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }
  function clearFilters() {
    setFilterStatuses([]);
    setFilterRequester("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterMinCost("");
    setFilterMaxCost("");
    setFilterAssignedToMe(false);
  }
  function mergeRequestUpdate(prev: PurchaseRequest, upd: PurchaseRequest): PurchaseRequest {
    const merged: PurchaseRequest = { ...prev, ...upd };
    if (!upd.items || upd.items.length === 0) {
      merged.items = prev.items;
      merged.totalEstimatedCost = prev.totalEstimatedCost;
    }
    if (!upd.quotes || (Array.isArray(upd.quotes) && upd.quotes.length === 0)) {
      merged.quotes = prev.quotes;
    }
    return merged;
  }
  function closeToast(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  // Language side-effects
  useEffect(() => {
    document.documentElement.lang = language === "ar" ? "ar" : "en";
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    localStorage.setItem(LS_KEYS.lang, language);
  }, [language]);

  // Persist user & requests
  useEffect(() => {
    if (currentUser) localStorage.setItem(LS_KEYS.user, JSON.stringify(currentUser));
    else localStorage.removeItem(LS_KEYS.user);
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.requests, JSON.stringify(requests));
  }, [requests]);

  // Auto-redirect SALES_REP to sales-visits
  useEffect(() => {
    if (currentUser?.apiRole === 'SALES_REP' && section !== 'sales-visits') {
      setSection('sales-visits');
      setView('detail');
    }
  }, [currentUser, section]);

  // Initial data load on first login
  useEffect(() => {
    if (!currentUser) return;
    // Ensure we have precise backend role info for gating actions
    (async () => {
      try {
        if (!currentUser.apiRole) {
          const serverUser = await authService.getCurrentUser();
          setCurrentUser((prev) =>
            prev
              ? {
                  ...prev,
                  // Keep existing display name, only refresh role fields
                  role: mapApiRoleToUi(serverUser.role),
                  apiRole: ["USER","DIRECT_MANAGER","ACCOUNTANT","ADMIN","FINAL_MANAGER","SALES_REP","SUPER_ADMIN"].includes(serverUser.role) ? (serverUser.role as User["apiRole"]) : undefined,
                }
              : prev
          );
        }
      } catch (e) {
        // Non-fatal: fallback to UI role gating
        console.warn("Failed to refresh user role from server", e);
      }
    })();

    setIsLoading(true);
    (async () => {
      try {
        const res = await requestsApi.getRequests({ per_page: 50 });
        let data = Array.isArray(res.data) ? res.data : [];
        // Ensure managers see something: if empty and role is manager, pull pending approvals
        if (data.length === 0 && currentUser.role === 'manager') {
          const pend = await requestsApi.getPendingApprovals({ per_page: 50 });
          data = Array.isArray(pend.data) ? pend.data : data;
        }
        setRequests(data.map(mapApiRequestToUi));
      } catch (e) {
        console.error("Failed to load requests", e);
        setRequests([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [currentUser]);

  // Listen for admin deletions from RequestDetailView
  useEffect(() => {
    function onDeleted(e: any) {
      const id = e?.detail?.id;
      if (!id) return;
      setRequests((prev) => prev.filter((p) => p.id !== id));
      setSelectedRequest((prev) => (prev && prev.id === id ? null : prev));
      addToast('success', t('requestDeleted'));
    }
    window.addEventListener('app:request-deleted', onDeleted as any);
    return () => window.removeEventListener('app:request-deleted', onDeleted as any);
  }, [t]);

  // Load users when admin section is active
  useEffect(() => {
    if (section === 'admin' && currentUser?.apiRole === 'ADMIN') {
      (async () => {
        try {
          setLoadingUsers(true);
          const res = await adminApi.getUsers({ per_page: 100 });
          if (res.data) setAdminUsers(res.data);
        } catch (e) {
          console.error('Failed to load users', e);
          addToast('error', 'Failed to load users');
        } finally {
          setLoadingUsers(false);
        }
      })();
    }
  }, [section, currentUser]);

  // Load notifications when user logs in
  useEffect(() => {
    if (!currentUser) return;
    loadNotifications();
  }, [currentUser]);

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [currentUser]);

  // Refresh notifications when panel opens
  useEffect(() => {
    if (showNotifications && currentUser) {
      loadNotifications();
    }
  }, [showNotifications, currentUser]);

  // Handlers
  function handleToggleLanguage() {
    setLanguage((prev) => (prev === "en" ? "ar" : "en"));
  }
  function handleLogout() {
    setCurrentUser(null);
    setSelectedRequest(null);
    localStorage.removeItem(LS_KEYS.token);
  }
  function handleLogin(user: User) {
    setCurrentUser(user);
    // In production, store real JWT/session token from backend
    if (!localStorage.getItem(LS_KEYS.token)) {
      localStorage.setItem(LS_KEYS.token, `token-set`);
    }
  }

  // Async action placeholders
  async function handleApproveRequest(id: string) {
    try {
      const resp = await approvalsApi.approveRequest(id, {});
      const updated = (resp.data as any)?.request ? mapApiRequestToUi((resp.data as any).request) : undefined;
      if (updated) {
        setRequests((prev) => prev.map((p) => (p.id === id ? mergeRequestUpdate(p, updated) : p)));
        setSelectedRequest((prev) => (prev && prev.id === id ? mergeRequestUpdate(prev, updated) : prev));
        addToast("success", t("approvedSuccess"));
      }
    } catch (e) {
      console.error("Approve failed", e);
      addToast("error", t("actionFailed"));
    }
  }
  async function handleRejectRequest(id: string, reason: string) {
    try {
      const resp = await approvalsApi.rejectRequest(id, { comment: reason });
      const updated = (resp.data as any)?.request ? mapApiRequestToUi((resp.data as any).request) : undefined;
      if (updated) {
        setRequests((prev) => prev.map((p) => (p.id === id ? mergeRequestUpdate(p, updated) : p)));
        setSelectedRequest((prev) => (prev && prev.id === id ? mergeRequestUpdate(prev, updated) : prev));
        addToast("success", t("rejectedSuccess"));
      } else {
        // fallback UI update
        setRequests((prev) => prev.map((p) => (p.id === id ? { ...p, status: "Rejected", rejectionReason: reason } : p)));
        setSelectedRequest((prev) => (prev && prev.id === id ? { ...prev, status: "Rejected", rejectionReason: reason } : prev));
        addToast("success", t("rejectedSuccess"));
      }
    } catch (e) {
      console.error("Reject failed", e);
      addToast("error", t("actionFailed"));
    }
  }
  async function handleAddQuotation(id: string, quotation: string) {
    try {
      setSelectedRequest((prev) => (prev && prev.id === id ? { ...prev, quotations: quotation } : prev));
      addToast("success", "Quotation updated");
    } catch (e) {
      console.error("Add quotation failed", e);
      addToast("error", t("actionFailed"));
    }
  }
  async function handleUploadQuoteUrl(id: string, quote: { vendorName: string; quoteTotal: number; fileUrl: string; notes?: string }) {
    try {
      const resp = await requestsApi.uploadQuoteUrl(id, {
        vendor_name: quote.vendorName,
        quote_total: quote.quoteTotal,
        file_url: quote.fileUrl,
        notes: quote.notes,
      });
      const updated = resp.data ? mapApiRequestToUi(resp.data) : undefined;
      if (updated) {
        setRequests((prev) => prev.map((p) => (p.id === id ? mergeRequestUpdate(p, updated) : p)));
        setSelectedRequest((prev) => (prev && prev.id === id ? mergeRequestUpdate(prev, updated) : prev));
        addToast("success", t("quoteUploaded"));
      }
    } catch (e) {
      console.error("Upload quote failed", e);
      addToast("error", t("actionFailed"));
    }
  }
  async function handleSelectQuote(id: string, quoteId?: string | number) {
    try {
      const resp = await approvalsApi.selectQuote(id, quoteId ? { quote_id: Number(quoteId) } : { auto_lowest: true });
      const updated = resp.data ? mapApiRequestToUi(resp.data) : undefined;
      if (updated) {
        setRequests((prev) => prev.map((p) => (p.id === id ? mergeRequestUpdate(p, updated) : p)));
        setSelectedRequest((prev) => (prev && prev.id === id ? mergeRequestUpdate(prev, updated) : prev));
        addToast("success", t("quoteSelected"));
      }
    } catch (e) {
      console.error("Select quote failed", e);
      addToast("error", t("actionFailed"));
    }
  }
  async function handleMarkProjectDone(id: string) {
    try {
      const resp = await approvalsApi.markProjectDone(id);
      const updated = resp.data ? mapApiRequestToUi(resp.data as any) : undefined;
      if (updated) {
        setRequests((prev) => prev.map((p) => (p.id === id ? mergeRequestUpdate(p, updated) : p)));
        setSelectedRequest((prev) => (prev && prev.id === id ? mergeRequestUpdate(prev, updated) : prev));
        addToast("success", t("markedDoneSuccess"));
      }
    } catch (e) {
      console.error('Mark project done failed', e);
      addToast("error", t("actionFailed"));
    }
  }
  async function handleConfirmClientPaid(id: string, payoutRef?: string) {
    try {
      const resp = await approvalsApi.confirmClientPaid(id, payoutRef ? { payout_reference: payoutRef } : undefined);
      const updated = resp.data ? mapApiRequestToUi(resp.data as any) : undefined;
      if (updated) {
        setRequests((prev) => prev.map((p) => (p.id === id ? mergeRequestUpdate(p, updated) : p)));
        setSelectedRequest((prev) => (prev && prev.id === id ? mergeRequestUpdate(prev, updated) : prev));
        addToast("success", t("paidConfirmedSuccess"));
      }
    } catch (e) {
      console.error('Confirm client paid failed', e);
      addToast("error", t("actionFailed"));
    }
  }
  async function handleSubmitDraft(id: string) {
    try {
      const resp = await requestsApi.submitRequest(id);
      const updated = resp.data ? mapApiRequestToUi(resp.data) : undefined;
      if (updated) {
        setRequests((prev) => prev.map((p) => (p.id === id ? mergeRequestUpdate(p, updated) : p)));
        setSelectedRequest((prev) => (prev && prev.id === id ? mergeRequestUpdate(prev, updated) : prev));
        addToast("success", t("submitSuccess"));
      }
    } catch (e) {
      console.error('Submit draft failed', e);
      addToast("error", t("actionFailed"));
    }
  }
  async function handleCreateRequest(data: { title: string; description: string; items: PRItem[]; directManagerId?: number | string }) {
    try {
      const desired = data.items.reduce((sum, it) => sum + (Number(it.estimatedCost) || 0) * (Number(it.quantity) || 0), 0);
  const dmId = (data.directManagerId !== undefined && String(data.directManagerId).trim() !== "") ? Number(data.directManagerId) : undefined;
      const resp = await requestsApi.createRequest({
        type: 'purchase',
        title: data.title,
        description: data.description,
        category: 'General',
        desired_cost: desired,
        currency: 'USD',
        needed_by_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        submit_immediately: true,
  direct_manager_id: dmId,
        items: data.items.map((it) => ({ name: it.name, quantity: it.quantity, unit_price: it.estimatedCost })),
      });
      const created = resp.data ? mapApiRequestToUi(resp.data) : undefined;
      if (created) {
        setRequests((prev) => [created, ...prev]);
        setSelectedRequest(created);
        addToast("success", t("createSuccess"));
      }
      setSection("requests");
      setView("detail");
    } catch (e) {
      console.error("Create request failed", e);
      const msg = (e as any)?.message || t("actionFailed");
      addToast("error", msg);
    }
  }

  async function handleCreateProject(data: {
    title: string;
    description: string;
    clientName: string;
    location: string;
    startTime: string; // ISO date-time or date string
    endTime: string;   // ISO date-time or date string
    totalCost: number;
    totalBenefit: number;
    totalPrice: number;
    directManagerId?: number | string;
    items?: PRItem[];
  }) {
    try {
      // Basic client validation
      if (!data.title.trim() || !data.clientName.trim() || !data.location.trim() || !data.startTime || !data.endTime) {
        addToast("error", t("projectValidationRequired"));
        return;
      }
      const start = new Date(data.startTime).getTime();
      const end = new Date(data.endTime).getTime();
      if (Number.isFinite(start) && Number.isFinite(end) && end < start) {
        addToast("error", t("projectValidationEndAfterStart"));
        return;
      }
      const desired = Number.isFinite(data.totalCost) ? data.totalCost : 0;
      // needed_by_date must be strictly after today
      const tomorrow = new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10);
      const payload: any = {
        type: 'project',
        title: data.title,
        description: data.description,
        category: 'Project',
        location: data.location,
        desired_cost: desired,
        currency: 'SAR',
        needed_by_date: tomorrow,
        start_time: data.startTime,
        end_time: data.endTime,
        submit_immediately: true,
        client_name: data.clientName,
        project_description: data.description,
        total_cost: data.totalCost,
        total_benefit: data.totalBenefit,
        total_price: data.totalPrice,
      };
      if (data.directManagerId !== undefined && String(data.directManagerId).trim() !== '') {
        payload.direct_manager_id = Number(data.directManagerId);
      }
      if (data.items && data.items.length > 0) {
        payload.items = data.items.map((it) => ({ name: it.name, quantity: it.quantity, unit_price: it.estimatedCost }));
      }
      const resp = await requestsApi.createRequest(payload);
      const created = resp.data ? mapApiRequestToUi(resp.data) : undefined;
      if (created) {
        setRequests((prev) => [created, ...prev]);
        setSelectedRequest(created);
        addToast("success", t("createSuccess"));
      }
      setSection("requests");
      setView("detail");
    } catch (e) {
      console.error("Create project failed", e);
      const msg = (e as any)?.message || t("actionFailed");
      addToast("error", msg);
    }
  }

  async function handleToggleUserStatus(userId: string) {
    try {
      await adminApi.toggleUserStatus(userId);
      const res = await adminApi.getUsers({ per_page: 100 });
      if (res.data) setAdminUsers(res.data);
      addToast('success', 'User status updated');
    } catch (e) {
      console.error('Toggle user status failed', e);
      addToast('error', 'Failed to update user status');
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await adminApi.deleteUser(userId);
      const res = await adminApi.getUsers({ per_page: 100 });
      if (res.data) setAdminUsers(res.data);
      addToast('success', 'User deleted');
    } catch (e) {
      console.error('Delete user failed', e);
      addToast('error', 'Failed to delete user');
    }
  }

  async function handleRefreshUsers() {
    try {
      setLoadingUsers(true);
      const res = await adminApi.getUsers({ per_page: 100 });
      if (res.data) setAdminUsers(res.data);
      addToast('success', 'Users refreshed');
    } catch (e) {
      console.error('Failed to refresh users', e);
      addToast('error', 'Failed to refresh users');
    } finally {
      setLoadingUsers(false);
    }
  }

  async function handleCreateUser() {
    // Trim inputs
    const payload = {
      ...newUserData,
      name: (newUserData.name || '').trim(),
      email: (newUserData.email || '').trim(),
      password: String(newUserData.password || '').trim(),
      first_name: (newUserData.first_name || '').trim(),
      last_name: (newUserData.last_name || '').trim(),
      phone: (newUserData.phone || '').trim(),
      position: (newUserData.position || '').trim(),
    };

    // Clear previous errors
    setNewUserErrors({});

    // Basic client-side validation - accumulate errors
    const errors: Record<string, string[]> = {};
    if (!payload.name) errors.name = [language === 'ar' ? 'الاسم مطلوب' : 'Name is required'];
    if (!payload.email) errors.email = [language === 'ar' ? 'البريد الإلكتروني مطلوب' : 'Email is required'];

    // Email format validation
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (payload.email && !emailRe.test(payload.email)) {
      errors.email = [...(errors.email || []), language === 'ar' ? 'يرجى إدخال بريد إلكتروني صالح' : 'Please enter a valid email address'];
    }

    // Password minimum length (backend requires min 6)
    if (!payload.password || payload.password.length < 6) {
      errors.password = [language === 'ar' ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل' : 'Password must be at least 6 characters'];
    }

    if (Object.keys(errors).length > 0) {
      setNewUserErrors(errors);
      return;
    }

    try {
      setIsCreatingUser(true);
      const res = await adminApi.createUser(payload);
      if (res && (res.success || res.data)) {
        // success
        setNewUserErrors({});
        addToast('success', language === 'ar' ? 'تم إنشاء المستخدم بنجاح' : 'User created successfully');
        setShowAddUserDialog(false);
        setNewUserData({
          name: '',
          email: '',
          password: 'password123',
          role: 'USER',
          first_name: '',
          last_name: '',
          phone: '',
          position: ''
        });
        await handleRefreshUsers();
      } else {
        addToast('error', language === 'ar' ? 'فشل إنشاء المستخدم' : 'Failed to create user');
      }
    } catch (e: any) {
      console.error('Failed to create user', e);
      // Laravel validation errors may come in response.data.errors, but our apiClient wraps errors
      const validationErrors = e?.response?.data?.errors;
      if (validationErrors && typeof validationErrors === 'object') {
        // Map backend validation errors to newUserErrors to display inline
        setNewUserErrors(validationErrors as Record<string, string[]>);
      } else {
        const backendMsg = e?.response?.data?.message || e?.message || (language === 'ar' ? 'فشل إنشاء المستخدم' : 'Failed to create user');
        addToast('error', backendMsg);
      }
    } finally {
      setIsCreatingUser(false);
    }
  }

  // Notification functions
  async function loadNotifications() {
    try {
      setLoadingNotifications(true);
      const res = await notificationsApi.getNotifications({ per_page: 50 });
      if (res.data && Array.isArray(res.data)) {
        setNotifications(res.data);
      } else {
        setNotifications([]);
      }
    } catch (e) {
      console.error('Failed to load notifications', e);
      setNotifications([]); // Set empty array on error
    } finally {
      setLoadingNotifications(false);
    }
  }

  async function handleMarkNotificationAsRead(id: string | number) {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {
      console.error('Failed to mark notification as read', e);
    }
  }

  async function handleMarkAllNotificationsAsRead() {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      addToast("success", "All notifications marked as read");
      setShowNotifications(false);
    } catch (e) {
      console.error('Failed to mark all as read', e);
      addToast("error", "Failed to mark notifications as read");
    }
  }

  async function handleDeleteNotification(id: string | number) {
    try {
      await notificationsApi.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      addToast("success", "Notification deleted");
    } catch (e) {
      console.error('Failed to delete notification', e);
      addToast("error", "Failed to delete notification");
    }
  }

  // Helper functions for new features
  function handleBulkApprove() {
    selectedRequestIds.forEach(id => handleApproveRequest(id));
    setSelectedRequestIds(new Set());
    addToast("success", `Approved ${selectedRequestIds.size} requests`);
  }

  function handleBulkReject() {
    const reason = prompt("Enter rejection reason for all selected requests:");
    if (!reason) return;
    selectedRequestIds.forEach(id => handleRejectRequest(id, reason));
    setSelectedRequestIds(new Set());
    addToast("success", `Rejected ${selectedRequestIds.size} requests`);
  }

  function handleExportToCSV() {
    const csvContent = [
      ["ID", "Title", "Requester", "Status", "Date", "Total Cost"],
      ...filtered.map(r => [
        r.id,
        r.title,
        r.requester,
        r.status,
        r.submittedDate,
        r.totalEstimatedCost
      ])
    ].map(row => row.join(",")).join("\\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `requests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("success", "Exported to CSV");
  }

  function toggleRequestSelection(id: string) {
    setSelectedRequestIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sq = sidebarSearch.trim().toLowerCase();
    let list = requests;
    
    // Apply sidebar search
    if (sq) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(sq) ||
          p.requester.toLowerCase().includes(sq) ||
          p.status.toLowerCase().includes(sq)
      );
    }
    
    // Apply quick filters
    if (quickFilter === "my" && currentUser) {
      list = list.filter(p => p.requesterId === currentUser.id || p.requester === currentUser.name);
    } else if (quickFilter === "pending") {
      list = list.filter(p => p.status === "Pending");
    } else if (quickFilter === "thisWeek") {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      list = list.filter(p => new Date(p.submittedDate).getTime() >= weekAgo);
    }
    
    // Apply main search
    if (q) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.requester.toLowerCase().includes(q) ||
          p.status.toLowerCase().includes(q)
      );
    }
    if (filterStatuses.length > 0) {
      list = list.filter((p) => filterStatuses.includes(p.status));
    }
    if (filterRequester.trim()) {
      const rq = filterRequester.trim().toLowerCase();
      list = list.filter((p) => p.requester.toLowerCase().includes(rq));
    }
    if (filterDateFrom) {
      const from = new Date(filterDateFrom).getTime();
      list = list.filter((p) => new Date(p.submittedDate).getTime() >= from);
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo).getTime();
      list = list.filter((p) => new Date(p.submittedDate).getTime() <= to);
    }
    const minCost = Number(filterMinCost);
    if (!Number.isNaN(minCost) && filterMinCost !== "") {
      list = list.filter((p) => p.totalEstimatedCost >= minCost);
    }
    const maxCost = Number(filterMaxCost);
    if (!Number.isNaN(maxCost) && filterMaxCost !== "") {
      list = list.filter((p) => p.totalEstimatedCost <= maxCost);
    }
    if (currentUser?.apiRole === 'DIRECT_MANAGER' && filterAssignedToMe) {
      const myId = String(currentUser.id);
      list = list.filter((p) => (p.directManagerId !== undefined && String(p.directManagerId) === myId));
    }
    return list;
  }, [search, sidebarSearch, quickFilter, requests, filterStatuses, filterRequester, filterDateFrom, filterDateTo, filterMinCost, filterMaxCost, filterAssignedToMe, currentUser]);

  // If current selection is excluded by filters, clear it or pick first filtered item
  useEffect(() => {
    if (view !== 'detail') return;
    if (!selectedRequest) return;
    const stillVisible = filtered.some((p) => p.id === selectedRequest.id);
    if (!stillVisible) {
      setSelectedRequest(filtered.length > 0 ? filtered[0] : null);
    }
  }, [filtered, selectedRequest, view]);

  // Computed stats for dashboard
  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === "Pending").length;
    const approved = requests.filter(r => r.status === "Approved").length;
    const rejected = requests.filter(r => r.status === "Rejected").length;
    const thisWeek = requests.filter(r => {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return new Date(r.submittedDate).getTime() >= weekAgo;
    }).length;
    const totalCost = requests.reduce((sum, r) => sum + r.totalEstimatedCost, 0);
    const avgCost = total > 0 ? totalCost / total : 0;
    return { total, pending, approved, rejected, thisWeek, totalCost, avgCost };
  }, [requests]);

  if (!currentUser) {
    return (
      <>
        <LoginView t={t} language={language} onLogin={handleLogin} notifyError={(msg) => addToast("error", msg)} />
        <ToastContainer t={t} toasts={toasts} onClose={closeToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Notification Panel Overlay */}
      {showNotifications && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998]"
          onClick={() => setShowNotifications(false)}
        />
      )}

      {/* Notification Panel */}
      {showNotifications && (
        <div className="fixed top-0 right-0 h-full bg-card shadow-2xl transition-all duration-300 z-[9999] w-80 overflow-hidden border-l border-border animate-in slide-in-from-right" style={{ backgroundColor: 'var(--card)' }}>
          <div className="flex flex-col h-full">
          {/* Header */}
          <div className="border-b border-border bg-gradient-to-r from-primary/10 to-warning/10 p-4">
            <div className={clsx(
              "flex items-center justify-between",
              language === "ar" && "flex-row-reverse"
            )}>
              <div className={clsx(
                "flex items-center gap-2",
                language === "ar" && "flex-row-reverse"
              )}>
                <Bell className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">{language === "ar" ? "الإشعارات" : "Notifications"}</h3>
                {unreadCount > 0 && (
                  <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowNotifications(false)}
                className="rounded-lg p-2 hover:bg-secondary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loadingNotifications ? (
              <div className="space-y-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="rounded-lg border border-border bg-secondary/20 p-3 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-secondary"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-secondary rounded w-3/4"></div>
                        <div className="h-3 bg-secondary rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !Array.isArray(notifications) || notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
                <p className="text-sm text-subtext">{language === "ar" ? "لا توجد إشعارات" : "No notifications"}</p>
                <p className="text-xs text-muted-foreground mt-2">{language === "ar" ? "أنت على اطلاع بكل شيء!" : "You're all caught up!"}</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const timeAgo = new Date(notif.created_at).toLocaleString(language === "ar" ? "ar-EG" : "en-US", {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                
                return (
                  <div
                    key={notif.id}
                    className={clsx(
                      "rounded-lg border p-3 transition-all duration-200 hover:shadow-md cursor-pointer group relative",
                      notif.read ? "bg-card border-border opacity-75" : "bg-primary/5 border-primary/20 shadow-sm"
                    )}
                    onClick={() => {
                      if (!notif.read) {
                        handleMarkNotificationAsRead(notif.id);
                      }
                      if (notif.related_request_id) {
                        const relatedRequest = requests.find(r => r.id === String(notif.related_request_id));
                        if (relatedRequest) {
                          setSelectedRequest(relatedRequest);
                          setView("detail");
                          setSection("requests");
                        }
                      }
                      setShowNotifications(false);
                    }}
                  >
                    <div className={clsx(
                      "flex items-start gap-3",
                      language === "ar" && "flex-row-reverse"
                    )}>
                      <div className={clsx(
                        "h-10 w-10 rounded-full grid place-items-center shrink-0",
                        notif.type === 'success' ? "bg-green-500/20 text-green-500" :
                        notif.type === 'warning' ? "bg-warning/20 text-warning" :
                        notif.type === 'error' ? "bg-red-500/20 text-red-500" :
                        "bg-blue-500/20 text-blue-500"
                      )}>
                        {notif.type === 'success' ? <CheckSquare className="h-5 w-5" /> :
                         notif.type === 'warning' ? <Clock className="h-5 w-5" /> :
                         notif.type === 'error' ? <X className="h-5 w-5" /> :
                         <Bell className="h-5 w-5" />}
                      </div>
                      <div className={clsx(
                        "flex-1 min-w-0",
                        language === "ar" && "text-right"
                      )}>
                        <div className={clsx(
                          "flex items-start justify-between gap-2",
                          language === "ar" && "flex-row-reverse"
                        )}>
                          <h4 className="text-sm font-semibold text-foreground">{notif.title}</h4>
                          {!notif.read && (
                            <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5 animate-pulse"></div>
                          )}
                        </div>
                        <p className="text-xs text-subtext mt-1 line-clamp-2">{notif.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">{timeAgo}</p>
                      </div>
                      {/* Delete button - shows on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notif.id);
                        }}
                        className={clsx(
                          "absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1 hover:bg-destructive/10 text-destructive",
                          language === "ar" ? "left-2" : "right-2"
                        )}
                        title="Delete"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border p-3 space-y-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllNotificationsAsRead}
                disabled={loadingNotifications}
                className="w-full rounded-lg bg-primary/10 text-primary px-4 py-2 text-sm font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {language === "ar" ? "تعيين الكل كمقروء" : "Mark all as read"}
              </button>
            )}
            <button
              onClick={() => {
                loadNotifications();
                addToast("success", language === "ar" ? "تم تحديث الإشعارات" : "Notifications refreshed");
              }}
              disabled={loadingNotifications}
              className="w-full rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className={clsx("h-4 w-4", loadingNotifications && "animate-spin")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {language === "ar" ? "تحديث" : "Refresh"}
            </button>
          </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          "fixed top-0 h-full bg-card shadow-xl transition-all duration-300 z-[60] flex flex-col",
          language === "ar" ? "left-0 border-r border-border" : "left-0 border-r border-border",
          sidebarOpen ? "w-64" : "w-16"
        )}
        style={language === "ar" ? { left: 'auto', right: 0 } : {}}
      >
        {/* Sidebar Header */}
        <div className={clsx(
          "flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-warning/10 to-primary/10",
          language === "ar" && "flex-row-reverse"
        )}>
          {sidebarOpen && (
            <div className={clsx("flex items-center gap-2", language === "ar" && "flex-row-reverse")}>
              <div className="h-8 w-8 rounded-lg bg-warning text-warning-foreground grid place-items-center font-extrabold shadow-sm">A</div>
              <span className="text-lg font-bold tracking-tight">{t("appTitle")}</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-2 hover:bg-secondary transition-colors"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Sidebar Actions */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {/* Search Bar */}
          {sidebarOpen && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder={t("search")}
                className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-warning"
              />
            </div>
          )}

          {/* Dashboard Button */}
          <button
            onClick={() => setShowDashboard(!showDashboard)}
            className={clsx(
              "w-full flex items-center gap-3 rounded-lg p-3 text-sm font-semibold transition-all duration-200",
              language === "ar" && "flex-row-reverse",
              showDashboard ? "bg-primary/20 text-primary shadow-md" : "hover:bg-primary/10 text-foreground"
            )}
            title={language === "ar" ? "لوحة القيادة" : "Dashboard"}
          >
            <Home className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>{language === "ar" ? "لوحة القيادة" : "Dashboard"}</span>}
          </button>

          {/* Notifications */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={clsx(
              "w-full flex items-center gap-3 rounded-lg p-3 text-sm font-semibold transition-all duration-200 relative",
              language === "ar" && "flex-row-reverse",
              showNotifications ? "bg-primary/20 text-primary" : "hover:bg-secondary text-foreground"
            )}
            title={language === "ar" ? "الإشعارات" : "Notifications"}
          >
            <Bell className={clsx("h-5 w-5 shrink-0", showNotifications && "animate-bounce")} />
            {sidebarOpen && <span>{language === "ar" ? "الإشعارات" : "Notifications"}</span>}
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full text-xs grid place-items-center font-bold animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Quick Filters */}
          {sidebarOpen && section === "requests" && (
            <>
              <div className={clsx("text-xs font-bold text-subtext uppercase tracking-wide px-2 py-2 mt-4", language === "ar" && "text-right")}>{language === "ar" ? "فلاتر سريعة" : "Quick Filters"}</div>
              <div className="space-y-1">
                <button
                  onClick={() => setQuickFilter("all")}
                  className={clsx(
                    "w-full flex items-center gap-2 rounded-lg p-2 text-sm transition-all",
                    language === "ar" && "flex-row-reverse",
                    quickFilter === "all" ? "bg-warning/20 text-warning font-semibold" : "hover:bg-secondary"
                  )}
                >
                  <FileText className="h-4 w-4" />
                  <span>{language === "ar" ? `جميع الطلبات (${requests.length})` : `All Requests (${requests.length})`}</span>
                </button>
                <button
                  onClick={() => setQuickFilter("my")}
                  className={clsx(
                    "w-full flex items-center gap-2 rounded-lg p-2 text-sm transition-all",
                    language === "ar" && "flex-row-reverse",
                    quickFilter === "my" ? "bg-warning/20 text-warning font-semibold" : "hover:bg-secondary"
                  )}
                >
                  <Users className="h-4 w-4" />
                  <span>{language === "ar" ? "طلباتي" : "My Requests"}</span>
                </button>
                <button
                  onClick={() => setQuickFilter("pending")}
                  className={clsx(
                    "w-full flex items-center gap-2 rounded-lg p-2 text-sm transition-all",
                    language === "ar" && "flex-row-reverse",
                    quickFilter === "pending" ? "bg-warning/20 text-warning font-semibold" : "hover:bg-secondary"
                  )}
                >
                  <Clock className="h-4 w-4" />
                  <span>{language === "ar" ? `قيد الانتظار (${stats.pending})` : `Pending (${stats.pending})`}</span>
                </button>
                <button
                  onClick={() => setQuickFilter("thisWeek")}
                  className={clsx(
                    "w-full flex items-center gap-2 rounded-lg p-2 text-sm transition-all",
                    language === "ar" && "flex-row-reverse",
                    quickFilter === "thisWeek" ? "bg-warning/20 text-warning font-semibold" : "hover:bg-secondary"
                  )}
                >
                  <Calendar className="h-4 w-4" />
                  <span>{language === "ar" ? `هذا الأسبوع (${stats.thisWeek})` : `This Week (${stats.thisWeek})`}</span>
                </button>
              </div>
            </>
          )}

          {/* Quick Actions */}
          {sidebarOpen && <div className={clsx("text-xs font-bold text-subtext uppercase tracking-wide px-2 py-2 mt-4", language === "ar" && "text-right")}>{language === "ar" ? "إجراءات سريعة" : "Quick Actions"}</div>}
          
          {currentUser.apiRole !== "SALES_REP" && (
            <button
              onClick={() => {
                setView("creating");
                setSelectedRequest(null);
                setSection("requests");
              }}
              className={clsx(
                "w-full flex items-center gap-3 rounded-lg p-3 text-sm font-semibold transition-all duration-200",
                language === "ar" && "flex-row-reverse",
                view === "creating" ? "bg-warning text-warning-foreground shadow-md" : "hover:bg-warning/10 text-foreground"
              )}
              title={t("createNew")}
            >
              <Plus className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>{t("createNew")}</span>}
            </button>
          )}

          {currentUser.apiRole !== "SALES_REP" && (
            <button
              onClick={() => {
                setView("creatingProject");
                setSelectedRequest(null);
                setSection("requests");
              }}
              className={clsx(
                "w-full flex items-center gap-3 rounded-lg p-3 text-sm font-semibold transition-all duration-200",
                language === "ar" && "flex-row-reverse",
                view === "creatingProject" ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-primary/10 text-foreground"
              )}
              title={t("submitProject")}
            >
              <FolderPlus className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>{t("submitProject")}</span>}
            </button>
          )}

          {/* Sections */}
          {sidebarOpen && <div className={clsx("text-xs font-bold text-subtext uppercase tracking-wide px-2 py-2 mt-4", language === "ar" && "text-right")}>{language === 'ar' ? 'الأقسام' : 'Sections'}</div>}
          
          {currentUser.apiRole !== "SALES_REP" && (
            <button
              onClick={() => {
                setSection("requests");
                setView("detail");
              }}
              className={clsx(
                "w-full flex items-center gap-3 rounded-lg p-3 text-sm font-semibold transition-all duration-200",
                language === "ar" && "flex-row-reverse",
                section === "requests" 
                  ? clsx(
                      "bg-warning/20 text-warning",
                      language === "ar" ? "border-r-4 border-warning" : "border-l-4 border-warning"
                    )
                  : "hover:bg-secondary text-foreground"
              )}
              title={t("requests")}
            >
              <FileText className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>{t("requests")}</span>}
              {sidebarOpen && section === "requests" && <ChevronRight className={clsx("h-4 w-4", language === "ar" ? "mr-auto" : "ml-auto")} />}
            </button>
          )}

          {(currentUser.apiRole === "DIRECT_MANAGER" || currentUser.apiRole === "FINAL_MANAGER" || currentUser.apiRole === "ADMIN") && (
            <button
              onClick={() => {
                setSection("inventory");
                setView("detail");
              }}
              className={clsx(
                "w-full flex items-center gap-3 rounded-lg p-3 text-sm font-semibold transition-all duration-200",
                language === "ar" && "flex-row-reverse",
                section === "inventory" 
                  ? clsx(
                      "bg-warning/20 text-warning",
                      language === "ar" ? "border-r-4 border-warning" : "border-l-4 border-warning"
                    )
                  : "hover:bg-secondary text-foreground"
              )}
              title={t("inventory")}
            >
              <Settings className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>{t("inventory")}</span>}
              {sidebarOpen && section === "inventory" && <ChevronRight className={clsx("h-4 w-4", language === "ar" ? "mr-auto" : "ml-auto")} />}
            </button>
          )}

          {currentUser.apiRole !== "SALES_REP" && (
            <button
              onClick={() => {
                setSection("inventory-requests");
                setView("detail");
              }}
              className={clsx(
                "w-full flex items-center gap-3 rounded-lg p-3 text-sm font-semibold transition-all duration-200",
                language === "ar" && "flex-row-reverse",
                section === "inventory-requests" 
                  ? clsx(
                      "bg-orange-500/20 text-orange-500",
                      language === "ar" ? "border-r-4 border-orange-500" : "border-l-4 border-orange-500"
                    )
                  : "hover:bg-secondary text-foreground"
              )}
              title={language === 'ar' ? 'طلبات المخزون' : 'Inventory Requests'}
            >
              <Package className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>{language === 'ar' ? 'طلبات المخزون' : 'Inventory Requests'}</span>}
              {sidebarOpen && section === "inventory-requests" && <ChevronRight className={clsx("h-4 w-4", language === "ar" ? "mr-auto" : "ml-auto")} />}
            </button>
          )}

          {currentUser.apiRole !== "SALES_REP" && (
            <button
              onClick={() => {
                setSection("studio-bookings");
                setView("detail");
              }}
              className={clsx(
                "w-full flex items-center gap-3 rounded-lg p-3 text-sm font-semibold transition-all duration-200",
                language === "ar" && "flex-row-reverse",
                section === "studio-bookings" 
                  ? clsx(
                      "bg-indigo-500/20 text-indigo-500",
                      language === "ar" ? "border-r-4 border-indigo-500" : "border-l-4 border-indigo-500"
                    )
                  : "hover:bg-secondary text-foreground"
              )}
              title={language === 'ar' ? 'حجوزات الاستوديو' : 'Studio Bookings'}
            >
              <Camera className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>{language === 'ar' ? 'حجوزات الاستوديو' : 'Studio Bookings'}</span>}
              {sidebarOpen && section === "studio-bookings" && <ChevronRight className={clsx("h-4 w-4", language === "ar" ? "mr-auto" : "ml-auto")} />}
            </button>
          )}

          {(currentUser.apiRole === "ADMIN" || currentUser.apiRole === "SUPER_ADMIN" || currentUser.apiRole === "SALES_REP" || currentUser.role === "manager" || currentUser.role === "sales") && (
            <button
              onClick={() => {
                setSection("sales-visits");
                setView("detail");
              }}
              className={clsx(
                "w-full flex items-center gap-3 rounded-lg p-3 text-sm font-semibold transition-all duration-200",
                language === "ar" && "flex-row-reverse",
                section === "sales-visits" 
                  ? clsx(
                      "bg-primary/20 text-primary",
                      language === "ar" ? "border-r-4 border-primary" : "border-l-4 border-primary"
                    )
                  : "hover:bg-secondary text-foreground"
              )}
              title={t("salesVisits")}
            >
              <Users className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>{t("salesVisits")}</span>}
              {sidebarOpen && section === "sales-visits" && <ChevronRight className={clsx("h-4 w-4", language === "ar" ? "mr-auto" : "ml-auto")} />}
            </button>
          )}

          {/* Filters Toggle */}
          {section === "requests" && (
            <>
              {sidebarOpen && <div className={clsx("text-xs font-bold text-subtext uppercase tracking-wide px-2 py-2 mt-4", language === "ar" && "text-right")}>{language === 'ar' ? 'خيارات العرض' : 'View Options'}</div>}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={clsx(
                  "w-full flex items-center gap-3 rounded-lg p-3 text-sm font-semibold transition-all duration-200",
                  language === "ar" && "flex-row-reverse",
                  showFilters ? "bg-primary/20 text-primary" : "hover:bg-secondary text-foreground"
                )}
                title={t("filters")}
              >
                <Filter className="h-5 w-5 shrink-0" />
                {sidebarOpen && <span>{t("filters")}</span>}
              </button>
            </>
          )}

          {/* Admin Section */}
          {currentUser.apiRole === 'ADMIN' && (
            <>
              {sidebarOpen && <div className={clsx("text-xs font-bold text-subtext uppercase tracking-wide px-2 py-2 mt-4", language === "ar" && "text-right")}>{language === 'ar' ? 'المسؤول' : 'Admin'}</div>}
              <button
                onClick={() => {
                  setSection("admin");
                  setView("detail");
                }}
                className={clsx(
                  "w-full flex items-center gap-3 rounded-lg p-3 text-sm font-semibold transition-all duration-200",
                  language === "ar" && "flex-row-reverse",
                  section === "admin" 
                    ? clsx(
                        "bg-warning/20 text-warning",
                        language === "ar" ? "border-r-4 border-warning" : "border-l-4 border-warning"
                      )
                    : "hover:bg-secondary text-foreground"
                )}
                title={t("adminPanel")}
              >
                <Settings className="h-5 w-5 shrink-0" />
                {sidebarOpen && <span>{t("adminPanel")}</span>}
                {sidebarOpen && section === "admin" && <ChevronRight className={clsx("h-4 w-4", language === "ar" ? "mr-auto" : "ml-auto")} />}
              </button>
            </>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-border p-3">
          {sidebarOpen ? (
            <div className="space-y-2">
              <div className={clsx("flex items-center gap-2 text-xs text-subtext", language === "ar" && "flex-row-reverse")}>
                <div className="h-8 w-8 rounded-full bg-warning/20 text-warning grid place-items-center font-bold text-sm">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div className={clsx("flex-1 min-w-0", language === "ar" && "text-right")}>
                  <div className="font-semibold truncate">{currentUser.name}</div>
                  <div className="text-xs text-subtext">{t(currentUser.role)}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleToggleLanguage}
                  className="flex-1 rounded-lg border border-border px-2 py-1.5 text-xs font-semibold hover:bg-secondary transition-all duration-200"
                >
                  {language === "en" ? "العربية" : "English"}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 rounded-lg bg-red-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition-all duration-200"
                >
                  {t("logout")}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleToggleLanguage}
                className="rounded-lg p-2 hover:bg-secondary transition-colors"
                title={t("language")}
              >
                <Settings className="h-5 w-5" />
              </button>
              <button
                onClick={handleLogout}
                className="rounded-lg p-2 bg-red-600 text-white hover:bg-red-700 transition-colors"
                title={t("logout")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        className="flex-1 transition-all duration-300 min-h-screen"
        style={language === "ar" 
          ? (sidebarOpen ? { marginRight: window.innerWidth >= 768 ? '18rem' : '16rem' } : { marginRight: window.innerWidth >= 768 ? '5rem' : '4rem' })
          : (sidebarOpen ? { marginLeft: window.innerWidth >= 768 ? '18rem' : '16rem' } : { marginLeft: window.innerWidth >= 768 ? '5rem' : '4rem' })
        }
      >
        {/* Top Navbar - Simplified */}
        <div className="sticky top-0 z-40 backdrop-blur-sm bg-card/80 border-b border-border shadow-sm">
          <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-2 md:py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold">
                {section === "inventory" ? t("inventoryManagement") : section === "admin" ? t("adminPanel") : section === "sales-visits" ? t("salesVisits") : t("requests")}
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-sm text-subtext hidden sm:inline">
                  {currentUser.name} • {t(currentUser.role)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="px-3 sm:px-4 md:px-6 lg:px-8 pb-8 md:pb-10 pt-3 md:pt-4">
          {/* Dashboard View */}
          {showDashboard && section === "requests" && (
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary grid place-items-center">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <div className="text-sm text-subtext">{language === 'ar' ? 'إجمالي الطلبات' : 'Total Requests'}</div>
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-warning/10 text-warning grid place-items-center">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.pending}</div>
                    <div className="text-sm text-subtext">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</div>
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-green-500/10 text-green-500 grid place-items-center">
                    <CheckSquare className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.approved}</div>
                    <div className="text-sm text-subtext">{language === 'ar' ? 'موافق عليها' : 'Approved'}</div>
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-blue-500/10 text-blue-500 grid place-items-center">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{formatCurrency(stats.totalCost, language)}</div>
                    <div className="text-sm text-subtext">{language === 'ar' ? 'التكلفة الإجمالية' : 'Total Cost'}</div>
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow col-span-full md:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{language === 'ar' ? 'النشاط الأخير' : 'Recent Activity'}</h3>
                  <Activity className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  {requests.slice(0, 5).map(r => (
                    <div key={r.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                      <span className="truncate flex-1">{r.title}</span>
                      <span className={clsx(
                        "px-2 py-1 rounded text-xs font-semibold",
                        r.status === "Approved" ? "bg-green-500/20 text-green-500" :
                        r.status === "Pending" ? "bg-warning/20 text-warning" :
                        r.status === "Rejected" ? "bg-red-500/20 text-red-500" :
                        "bg-blue-500/20 text-blue-500"
                      )}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-3 md:p-4 shadow-sm hover:shadow-md transition-shadow col-span-full sm:col-span-2 md:col-span-2">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <h3 className="font-semibold text-sm md:text-base">{language === 'ar' ? 'التحليلات' : 'Analytics'}</h3>
                  <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{language === 'ar' ? 'معدل الموافقة' : 'Approval Rate'}</span>
                      <span className="font-semibold">{stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all duration-500"
                        style={{ width: `${stats.total > 0 ? (stats.approved / stats.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{language === 'ar' ? 'معدل الرفض' : 'Rejection Rate'}</span>
                      <span className="font-semibold">{stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500 transition-all duration-500"
                        style={{ width: `${stats.total > 0 ? (stats.rejected / stats.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <div className="text-sm">{language === 'ar' ? 'متوسط التكلفة:' : 'Average Cost:'} <span className="font-semibold">{formatCurrency(stats.avgCost, language)}</span></div>
                    <div className="text-sm">{language === 'ar' ? 'هذا الأسبوع:' : 'This Week:'} <span className="font-semibold">{stats.thisWeek} {language === 'ar' ? 'طلبات' : 'requests'}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Actions Bar */}
          {section === "requests" && selectedRequestIds.size > 0 && (
            <div className="mb-4 bg-warning/10 border border-warning rounded-lg p-2 md:p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-0">
              <span className="font-semibold">{selectedRequestIds.size} {language === 'ar' ? 'طلبات محددة' : 'requests selected'}</span>
              <div className="flex gap-2">
                {currentUser.role === "manager" && (
                  <>
                    <button
                      onClick={handleBulkApprove}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                    >
                      {language === 'ar' ? 'الموافقة على الكل' : 'Approve All'}
                    </button>
                    <button
                      onClick={handleBulkReject}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
                    >
                      {language === 'ar' ? 'رفض الكل' : 'Reject All'}
                    </button>
                  </>
                )}
                <button
                  onClick={handleExportToCSV}
                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {language === 'ar' ? 'تصدير' : 'Export'}
                </button>
                <button
                  onClick={() => setSelectedRequestIds(new Set())}
                  className="px-3 py-1.5 bg-secondary text-foreground rounded-lg text-sm font-semibold hover:bg-secondary/80 transition-colors"
                >
                  {language === 'ar' ? 'مسح' : 'Clear'}
                </button>
              </div>
            </div>
          )}

          {section === "inventory" ? (
            <InventoryManagement language={language} currentUser={currentUser} t={t} />
          ) : section === "inventory-requests" ? (
            <InventoryRequestManagement language={language} currentUser={currentUser} t={t} />
          ) : section === "studio-bookings" ? (
            <StudioBookingManagement language={language} currentUser={currentUser} t={t} />
          ) : section === "sales-visits" ? (
            <SalesVisitManagement language={language} currentUser={currentUser} t={t} />
          ) : section === "admin" ? (
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Admin Dashboard Header */}
              <div className="rounded-xl border border-border bg-gradient-to-r from-warning/10 via-primary/10 to-warning/10 p-4 md:p-6 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-xl bg-warning text-warning-foreground grid place-items-center shadow-md">
                    <Settings className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{t('adminPanel')}</h2>
                    <p className="text-sm text-subtext mt-1">{language === 'ar' ? 'إدارة المستخدمين وإعدادات النظام' : 'Manage users and system settings'}</p>
                  </div>
                </div>
              </div>

              {/* System Stats & Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div className="rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-subtext uppercase tracking-wide">{language === 'ar' ? 'إجمالي الطلبات' : 'Total Requests'}</div>
                        <div className="text-2xl font-bold text-primary mt-1">{requests.length}</div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-warning/10 text-warning grid place-items-center">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-subtext uppercase tracking-wide">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</div>
                        <div className="text-2xl font-bold text-warning mt-1">{requests.filter(r => r.status === 'Pending').length}</div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-green-500/10 text-green-500 grid place-items-center">
                        <CheckSquare className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-subtext uppercase tracking-wide">{language === 'ar' ? 'موافق عليها' : 'Approved'}</div>
                        <div className="text-2xl font-bold text-green-500 mt-1">{requests.filter(r => r.status === 'Approved' || r.status === 'Active').length}</div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-500 grid place-items-center">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-subtext uppercase tracking-wide">{language === 'ar' ? 'إجمالي المستخدمين' : 'Total Users'}</div>
                        <div className="text-2xl font-bold text-blue-500 mt-1">{adminUsers.length}</div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSection('sales-visits')}>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-500 grid place-items-center">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-subtext uppercase tracking-wide">{language === 'ar' ? 'زيارات المبيعات' : 'Sales Visits'}</div>
                        <div className="text-2xl font-bold text-purple-500 mt-1">{adminUsers.filter(u => u.role === 'SALES_REP').length}</div>
                        <div className="text-xs text-subtext mt-1">{language === 'ar' ? 'مندوبي مبيعات نشطين' : 'Active Sales Reps'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                    <div className="text-xs font-semibold text-subtext uppercase tracking-wide mb-3">{language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}</div>
                    <div className="space-y-2">
                      {/* Export Requests Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowExportDropdown(!showExportDropdown)}
                          className="w-full flex items-center justify-between gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                          <div className="flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            {language === 'ar' ? 'تصدير الطلبات' : 'Export Requests'}
                          </div>
                          <ChevronDown className={clsx("h-4 w-4 transition-transform", showExportDropdown && "rotate-180")} />
                        </button>
                        {showExportDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-card shadow-lg z-10 overflow-hidden">
                            <button
                              onClick={() => {
                                handleExportToCSV();
                                setShowExportDropdown(false);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary transition-colors text-left"
                            >
                              <FileSpreadsheet className="h-4 w-4 text-green-600" />
                              <span>{language === 'ar' ? 'تصدير إلى CSV' : 'Export to CSV'}</span>
                            </button>
                            <button
                              onClick={() => {
                                handleExportToCSV();
                                setShowExportDropdown(false);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary transition-colors text-left"
                            >
                              <FileSpreadsheet className="h-4 w-4 text-green-700" />
                              <span>{language === 'ar' ? 'تصدير إلى Excel' : 'Export to Excel'}</span>
                            </button>
                            <button
                              onClick={() => {
                                handleExportToCSV();
                                setShowExportDropdown(false);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-secondary transition-colors text-left"
                            >
                              <FileText className="h-4 w-4 text-red-600" />
                              <span>{language === 'ar' ? 'تصدير إلى PDF' : 'Export to PDF'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {/* Manage Sales Visits Button */}
                      <button
                        onClick={() => setSection('sales-visits')}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700 transition-colors"
                      >
                        <TrendingUp className="h-4 w-4" />
                        {language === 'ar' ? 'إدارة الزيارات' : 'Manage Sales Visits'}
                      </button>
                    </div>
                  </div>
                </div>

              {/* Users List */}
              <div className="rounded-xl border border-border bg-card shadow-md">
                <div className="border-b border-border bg-gradient-to-r from-primary/5 to-warning/5 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        {language === 'ar' ? 'المستخدمون الحاليون' : 'Current Users'}
                      </h3>
                      <p className="text-xs text-subtext mt-1">{language === 'ar' ? 'إدارة حسابات المستخدمين والأدوار' : 'Manage user accounts and roles'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRefreshUsers}
                        disabled={loadingUsers}
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary transition-all duration-200 disabled:opacity-50"
                      >
                        <svg className={clsx("h-4 w-4", loadingUsers && "animate-spin")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {language === 'ar' ? 'تحديث' : 'Refresh'}
                      </button>
                      <button
                        onClick={() => setShowAddUserDialog(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition-all duration-200"
                      >
                        <Plus className="h-4 w-4" />
                        {language === 'ar' ? 'إضافة مستخدم' : 'Add User'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {loadingUsers ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="rounded-lg border border-border bg-secondary/20 p-4 animate-pulse">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-secondary"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-secondary rounded w-1/3"></div>
                              <div className="h-3 bg-secondary rounded w-1/4"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : adminUsers.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                        <Users className="h-8 w-8 text-primary" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{language === 'ar' ? 'لم يتم العثور على مستخدمين' : 'No users found'}</p>
                      <p className="text-xs text-subtext mt-1">{language === 'ar' ? 'لا يوجد مستخدمون مسجلون في النظام' : 'No users registered in the system'}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {adminUsers.map((user) => {
                        const userName = user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
                        const userRole = user.role || 'USER';
                        const isActive = user.status === 'active' || user.is_active;
                        const roleColors: Record<string, string> = {
                          ADMIN: 'bg-red-100 text-red-800 border-red-200',
                          SUPER_ADMIN: 'bg-red-100 text-red-800 border-red-200',
                          FINAL_MANAGER: 'bg-purple-100 text-purple-800 border-purple-200',
                          DIRECT_MANAGER: 'bg-blue-100 text-blue-800 border-blue-200',
                          ACCOUNTANT: 'bg-green-100 text-green-800 border-green-200',
                          SALES_REP: 'bg-orange-100 text-orange-800 border-orange-200',
                          USER: 'bg-gray-100 text-gray-800 border-gray-200',
                        };
                        return (
                          <div key={user.id} className="rounded-lg border border-border bg-background p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-full bg-warning/20 text-warning grid place-items-center font-bold text-sm shrink-0">
                                {userName.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-sm truncate">{userName}</h4>
                                  <span className={clsx(
                                    "rounded-full px-2 py-0.5 text-xs font-bold border",
                                    roleColors[userRole] || roleColors.USER
                                  )}>
                                    {userRole.replace('_', ' ')}
                                  </span>
                                  {!isActive && (
                                    <span className="rounded-full px-2 py-0.5 text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                                      {language === 'ar' ? 'غير نشط' : 'Inactive'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-subtext mt-1">{user.email}</p>
                                {user.position && (
                                  <p className="text-xs text-subtext">{user.position}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleUserStatus(String(user.id))}
                                  className={clsx(
                                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                                    isActive
                                      ? "bg-yellow-100 text-yellow-800 border border-yellow-200 hover:bg-yellow-200"
                                      : "bg-green-100 text-green-800 border border-green-200 hover:bg-green-200"
                                  )}
                                  title={isActive ? (language === 'ar' ? 'تعطيل' : 'Deactivate') : (language === 'ar' ? 'تفعيل' : 'Activate')}
                                >
                                  {isActive ? (language === 'ar' ? 'تعطيل' : 'Deactivate') : (language === 'ar' ? 'تفعيل' : 'Activate')}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(String(user.id))}
                                  className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-800 border border-red-200 hover:bg-red-200 transition-all duration-200"
                                  title={language === 'ar' ? 'حذف المستخدم' : 'Delete user'}
                                >
                                  {language === 'ar' ? 'حذف' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Add User Dialog */}
              {showAddUserDialog && (
                <>
                  <div 
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    onClick={() => { setShowAddUserDialog(false); setNewUserErrors({}); }}
                  />
                  <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
                    <div
                      className="rounded-xl border border-border shadow-2xl"
                      style={{ background: "var(--gradient-luxury-card)" }}
                    >
                      <div className="border-b border-border bg-gradient-to-r from-primary/10 to-warning/10 px-6 py-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold">{language === 'ar' ? 'إضافة مستخدم جديد' : 'Add New User'}</h3>
                          <button
                            onClick={() => { setShowAddUserDialog(false); setNewUserErrors({}); }}
                            className="rounded-lg p-2 hover:bg-secondary transition-colors"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                        <p className="text-xs text-subtext mt-1">{language === 'ar' ? 'املأ التفاصيل لإنشاء حساب مستخدم جديد' : 'Fill in the details to create a new user account'}</p>
                      </div>
                      <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold">{language === 'ar' ? 'الاسم الكامل' : 'Full Name'} <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={newUserData.name}
                            onChange={(e) => {
                              setNewUserData(prev => ({ ...prev, name: e.target.value }));
                              setNewUserErrors(prev => ({ ...prev, name: [] }));
                            }}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder={language === 'ar' ? 'أدخل الاسم الكامل' : 'Enter full name'}
                          />
                          {newUserErrors.name && newUserErrors.name.length > 0 && (
                            <p className="text-xs text-destructive mt-1">{newUserErrors.name.join(' - ')}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'} <span className="text-red-500">*</span></label>
                          <input
                            type="email"
                            value={newUserData.email}
                            onChange={(e) => {
                              setNewUserData(prev => ({ ...prev, email: e.target.value }));
                              setNewUserErrors(prev => ({ ...prev, email: [] }));
                            }}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder={language === 'ar' ? 'أدخل البريد الإلكتروني' : 'Enter email address'}
                          />
                          {newUserErrors.email && newUserErrors.email.length > 0 && (
                            <p className="text-xs text-destructive mt-1">{newUserErrors.email.join(' - ')}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold">{language === 'ar' ? 'كلمة المرور' : 'Password'} <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={newUserData.password}
                            onChange={(e) => {
                              setNewUserData(prev => ({ ...prev, password: e.target.value }));
                              setNewUserErrors(prev => ({ ...prev, password: [] }));
                            }}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder={language === 'ar' ? 'أدخل كلمة المرور' : 'Enter password'}
                          />
                          {newUserErrors.password && newUserErrors.password.length > 0 && (
                            <p className="text-xs text-destructive mt-1">{newUserErrors.password.join(' - ')}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold">{language === 'ar' ? 'الدور' : 'Role'} <span className="text-red-500">*</span></label>
                          <select
                            value={newUserData.role}
                            onChange={(e) => setNewUserData(prev => ({ ...prev, role: e.target.value }))}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="USER">{language === 'ar' ? 'مستخدم' : 'User'}</option>
                            <option value="DIRECT_MANAGER">{language === 'ar' ? 'مدير مباشر' : 'Direct Manager'}</option>
                            <option value="ACCOUNTANT">{language === 'ar' ? 'محاسب' : 'Accountant'}</option>
                            <option value="FINAL_MANAGER">{language === 'ar' ? 'مدير نهائي' : 'Final Manager'}</option>
                            <option value="ADMIN">{language === 'ar' ? 'مسؤول' : 'Admin'}</option>
                            <option value="SALES_REP">{language === 'ar' ? 'مندوب مبيعات' : 'Sales Representative'}</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold">{language === 'ar' ? 'الاسم الأول' : 'First Name'}</label>
                            <input
                              type="text"
                              value={newUserData.first_name}
                              onChange={(e) => setNewUserData(prev => ({ ...prev, first_name: e.target.value }))}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder={language === 'ar' ? 'اختياري' : 'Optional'}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold">{language === 'ar' ? 'اسم العائلة' : 'Last Name'}</label>
                            <input
                              type="text"
                              value={newUserData.last_name}
                              onChange={(e) => setNewUserData(prev => ({ ...prev, last_name: e.target.value }))}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder={language === 'ar' ? 'اختياري' : 'Optional'}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold">{language === 'ar' ? 'رقم الهاتف' : 'Phone'}</label>
                          <input
                            type="tel"
                            value={newUserData.phone}
                            onChange={(e) => setNewUserData(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder={language === 'ar' ? 'اختياري' : 'Optional'}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold">{language === 'ar' ? 'المنصب' : 'Position'}</label>
                          <input
                            type="text"
                            value={newUserData.position}
                            onChange={(e) => setNewUserData(prev => ({ ...prev, position: e.target.value }))}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder={language === 'ar' ? 'اختياري' : 'Optional'}
                          />
                        </div>
                      </div>
                      <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setShowAddUserDialog(false); setNewUserErrors({}); }}
                          disabled={isCreatingUser}
                          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary transition-colors disabled:opacity-50"
                        >
                          {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                          onClick={handleCreateUser}
                          disabled={isCreatingUser}
                          className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                        >
                          {isCreatingUser && (
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          )}
                          {language === 'ar' ? 'إنشاء مستخدم' : 'Create User'}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
              {/* Column 1: Request List - Hide when creating */}
              {view === "detail" && (
                <section className="md:col-span-4 lg:col-span-3">
                  <div className="rounded-xl border border-border bg-card shadow-md hover:shadow-lg transition-shadow duration-200">
                    <div className="flex flex-wrap items-center gap-2 border-b border-border p-2 md:p-3">
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t("search")}
                        className="w-full rounded-md border border-border bg-background px-2 md:px-3 py-1.5 text-sm shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20"
                      />
                    </div>
              {showFilters && (
                <div className="border-b border-border p-3">
                  <div className="grid grid-cols-1 gap-3">
                    {currentUser.apiRole === 'DIRECT_MANAGER' && (
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-xs text-subtext" htmlFor="assignedToMeChk">{t("assignedToMe")}</label>
                        <input
                          id="assignedToMeChk"
                          type="checkbox"
                          className="h-4 w-4"
                          checked={filterAssignedToMe}
                          onChange={(e) => setFilterAssignedToMe(e.target.checked)}
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                      <label className="text-xs text-subtext">{t("status")}</label>
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {(["Pending","Approved","Rejected","Awaiting Payment","Awaiting Selection","Active","Processed","Processing","Done","Paid"] as Array<PurchaseRequest["status"]>).map((s) => (
                          <button
                            key={s}
                            onClick={() => toggleStatus(s)}
                            className={clsx(
                              "rounded-full border px-2 md:px-3 py-1 md:py-1.5 text-xs font-semibold transition-all duration-200",
                              filterStatuses.includes(s)
                                ? "bg-warning text-warning-foreground border-warning shadow-md scale-105"
                                : "border-border hover:bg-secondary hover:border-primary hover:scale-105"
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs font-semibold text-primary">{t("requesterFilter")}</label>
                      <input
                        value={filterRequester}
                        onChange={(e) => setFilterRequester(e.target.value)}
                        placeholder="Enter name..."
                        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs font-semibold text-primary">{t("dateFrom")}</label>
                      <input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs font-semibold text-primary">{t("dateTo")}</label>
                      <input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs font-semibold text-warning">{t("minCost")}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-subtext">SAR</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={filterMinCost}
                          onChange={(e) => setFilterMinCost(e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-md border border-border bg-background pl-12 pr-3 py-1.5 text-sm shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20 transition-colors duration-200"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs font-semibold text-warning">{t("maxCost")}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-subtext">SAR</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={filterMaxCost}
                          onChange={(e) => setFilterMaxCost(e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-md border border-border bg-background pl-12 pr-3 py-1.5 text-sm shadow-sm focus:border-warning focus:outline-none focus:ring-2 focus:ring-warning/20 transition-colors duration-200"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <span className="text-xs text-subtext">{filtered.length} {filtered.length === 1 ? 'result' : 'results'}</span>
                      <button onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all duration-200">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {t("clearFilters")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="max-h-[60vh] md:max-h-[70vh] space-y-2 overflow-auto p-2 md:p-3">
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="rounded-lg border border-border bg-card p-3 animate-pulse">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-secondary rounded w-3/4"></div>
                            <div className="h-3 bg-secondary rounded w-1/2"></div>
                            <div className="h-3 bg-secondary rounded w-2/3"></div>
                          </div>
                          <div className="h-6 w-20 bg-secondary rounded-full"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-12 text-center animate-in fade-in zoom-in duration-300">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{t("noRequests")}</p>
                    <p className="text-xs text-subtext mt-1">Start by creating a new request above</p>
                  </div>
                ) : (
                  filtered.map((pr) => (
                    <RequestCard
                      key={pr.id}
                      pr={pr}
                      selected={selectedRequest?.id === pr.id && view === "detail"}
                      onClick={() => {
                        setSelectedRequest(pr);
                        setView("detail");
                      }}
                      t={t}
                      lang={language}
                      isChecked={selectedRequestIds.has(pr.id)}
                      onToggleCheck={toggleRequestSelection}
                    />
                  ))
                )}
              </div>
            </div>
          </section>
              )}

          {/* Column 2: Detail or Create */}
          <section className={clsx(
            view === "creating" || view === "creatingProject" ? "md:col-span-12" : "md:col-span-8 lg:col-span-9"
          )}>
            {view === "creating" ? (
              <RequestCreateForm
                t={t}
                lang={language}
                onSubmit={handleCreateRequest}
                onCancel={() => setView("detail")}
              />)
            : view === "creatingProject" ? (
              <ProjectCreateForm
                t={t}
                lang={language}
                onSubmit={handleCreateProject}
                onCancel={() => setView("detail")}
              />)
            : selectedRequest ? (
              <RequestDetailView
                pr={selectedRequest}
                t={t}
                lang={language}
                currentUser={currentUser}
                onApprove={handleApproveRequest}
                onReject={handleRejectRequest}
                onSubmitQuotation={handleAddQuotation}
                onUploadQuoteUrl={handleUploadQuoteUrl}
                onSelectQuote={handleSelectQuote}
                onSubmitDraft={handleSubmitDraft}
                onMarkProjectDone={handleMarkProjectDone}
                onConfirmClientPaid={handleConfirmClientPaid}
              />
            ) : (
              <div className="grid h-[70vh] place-items-center rounded-xl border border-dashed border-border bg-card p-6 text-subtext">
                <p>{t("welcome")}</p>
              </div>
            )}
          </section>

              {/* Column 3: Comments (visible when a request is selected) */}
              {view === "detail" && (
                <section className="md:col-span-3">
                  {selectedRequest ? (
                    <CommentsPanel prId={selectedRequest.id} lang={language} t={t} />
                  ) : (
                    <section className="rounded-xl border border-dashed border-border bg-card/60 p-5 text-sm text-subtext">
                      {t('discussionComments')}
                    </section>
                  )}
                </section>
              )}
            </div>
          )}
        </main>
      </div>
      
      <ToastContainer t={t} toasts={toasts} onClose={closeToast} />
    </div>
  );
};

export default App;
