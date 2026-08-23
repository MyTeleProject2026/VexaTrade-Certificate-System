// Compatibility layer for the lucide-react version used by the user portal.
// Keep this list explicit so Vite can resolve every icon used by App.jsx.
export {
  LayoutDashboard,
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
  ExternalLink,
  ArrowLeft,
  ArrowRight,
  Save,
  Copy,
  BadgeCheck
} from "../node_modules/lucide-react/dist/esm/lucide-react.js";

// The installed Lucide version does not expose a Certificate icon.
export { BadgeCheck as Certificate } from "../node_modules/lucide-react/dist/esm/lucide-react.js";
