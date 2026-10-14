/**
 * SUGU Pro design system — public entry point.
 * Pages import from "@/design-system" only, never from sub-paths.
 * See docs/DESIGN_SYSTEM.md.
 */

export { cn } from "./cn";

// Actions
export { Button, ButtonGroup, IconButton, buttonVariants } from "./primitives/button";
export type { ButtonProps, IconButtonProps, ButtonGroupProps } from "./primitives/button";
export {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./primitives/dropdown-menu";
export { Tooltip } from "./primitives/tooltip";

// Information
export { Badge } from "./primitives/badge";
export type { BadgeProps, Tone } from "./primitives/badge";
export { Card, Section, iconTileClass } from "./primitives/card";
export { Stat } from "./primitives/stat";
export type { StatProps, StatTrend } from "./primitives/stat";
export { Avatar } from "./primitives/avatar";
export { EmptyState, ErrorState } from "./primitives/states";
export { Skeleton } from "./primitives/skeleton";
export { Alert } from "./primitives/alert";
export { DescriptionList } from "./primitives/description-list";
export type { DescriptionItem } from "./primitives/description-list";

// Local navigation
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./primitives/tabs";
export { Pagination } from "./primitives/pagination";
export type { PaginationProps } from "./primitives/pagination";
export { Breadcrumbs } from "./primitives/breadcrumbs";
export type { BreadcrumbItem } from "./primitives/breadcrumbs";

// Overlays
export { ConfirmDialog, Dialog, DialogClose, DialogContent, DialogTrigger } from "./primitives/dialog";
export type { ConfirmDialogProps } from "./primitives/dialog";
export { Sheet, SheetClose, SheetContent, SheetTrigger } from "./primitives/sheet";

// Page structure
export { PageHeader } from "./primitives/page-header";
export type { PageAction, PageHeaderProps } from "./primitives/page-header";
export { Toolbar, ToolbarCount, ToolbarFilter, ToolbarSearch } from "./primitives/toolbar";
export { DataTable } from "./data-table/data-table";
export type {
  DataTableColumn,
  DataTableProps,
  DataTableSelection,
  MobileRole,
  SortDirection,
  SortState,
} from "./data-table/data-table";

// Forms
export { FormField } from "./forms/field";
export type { FormFieldProps } from "./forms/field";
export { Input, Select, Textarea } from "./forms/input";
export type { InputProps, SelectOption, SelectProps, TextareaProps } from "./forms/input";
export { PasswordInput } from "./forms/password-input";
export type { PasswordInputProps } from "./forms/password-input";
export { Checkbox, Radio, RadioGroup, Switch } from "./forms/choice";
export { Combobox } from "./forms/combobox";
export type { ComboboxOption, ComboboxProps } from "./forms/combobox";
export { FormActions, StepActions, Stepper } from "./forms/stepper";
export type { StepDefinition } from "./forms/stepper";
export { FormErrorSummary, fieldErrorsFromZod } from "./forms/errors";

// Business statuses
export { StatusBadge } from "./status/status-badge";
export { UNKNOWN_STATUS_LABEL, defineStatusRegistry } from "./status/registry";
export type { ResolvedStatus, StatusDefinition, StatusRegistry } from "./status/registry";
export {
  agencyDeliveryStatus,
  courierActivity,
  courierMissionStatus,
  courierStatus,
  customerSegment,
  deliveryPaymentStatus,
  deliveryStatus,
  discountStatus,
  kycDocumentStatus,
  kycRequestStatus,
  orderPaymentStatus,
  orderStatus,
  paymentStatus,
  payoutMethodStatus,
  payoutStatus,
  productStatus,
  statusRegistries,
  stockStatus,
  suguBoxInboundStatus,
  suguBoxListingStatus,
  suguBoxMovementType,
  suguBoxOutboundStatus,
  ticketStatus,
} from "./status/domains";
export type { StatusDomain } from "./status/domains";

// Money
export {
  Money,
  asCents,
  asFrancs,
  centsToFrancs,
  formatMoneyFromCents,
  formatMoneyFromFrancs,
  francsToCents,
} from "./money/money";
export type { MoneyCents, MoneyFormatOptions, MoneyFrancs } from "./money/money";
