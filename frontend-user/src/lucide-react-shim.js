// Compatibility layer for the lucide-react version used by the user portal.
// Use a relative node_modules path so Vite's lucide-react alias does not recurse
// back into this shim.
export {
  LayoutDashboard,
  FileCheck2,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Bell,
  UserRound,
  UploadCloud,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  WalletCards,
  Copy,
  ExternalLink,
  BadgeCheck
} from "../node_modules/lucide-react/dist/esm/lucide-react.js";

export { BadgeCheck as Certificate } from "../node_modules/lucide-react/dist/esm/lucide-react.js";
