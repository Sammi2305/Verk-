import type { SVGProps } from "react";

// A small, consistent icon set (24px grid, 1.75 stroke). Decorative by
// default; pass aria-label + role="img" when an icon carries meaning alone.
type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props["aria-label"] ? undefined : true}
      width={20}
      height={20}
      {...props}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = (p: IconProps) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>;
export const MapPinIcon = (p: IconProps) => <Icon {...p}><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></Icon>;
export const CheckIcon = (p: IconProps) => <Icon {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>;
export const ShieldCheckIcon = (p: IconProps) => <Icon {...p}><path d="M12 3 5 6v5.5c0 4.3 2.9 8.2 7 9.5 4.1-1.3 7-5.2 7-9.5V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></Icon>;
export const BadgeCheckIcon = (p: IconProps) => <Icon {...p}><path d="M12 2.8 14.3 4.5l2.9-.1.9 2.7 2.4 1.7-.9 2.7.9 2.7-2.4 1.7-.9 2.7-2.9-.1L12 21.2l-2.3-1.7-2.9.1-.9-2.7-2.4-1.7.9-2.7-.9-2.7 2.4-1.7.9-2.7 2.9.1L12 2.8Z" /><path d="m9 12 2 2 4-4" /></Icon>;
export const CalendarIcon = (p: IconProps) => <Icon {...p}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></Icon>;
export const ClockIcon = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Icon>;
export const PhoneIcon = (p: IconProps) => <Icon {...p}><path d="M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z" /></Icon>;
export const MailIcon = (p: IconProps) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6 8.5-6" /></Icon>;
export const ChatIcon = (p: IconProps) => <Icon {...p}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-5 4V5.5Z" /></Icon>;
export const BellIcon = (p: IconProps) => <Icon {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></Icon>;
export const MenuIcon = (p: IconProps) => <Icon {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>;
export const XIcon = (p: IconProps) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>;
export const ArrowRightIcon = (p: IconProps) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>;
export const ArrowLeftIcon = (p: IconProps) => <Icon {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></Icon>;
export const ImageIcon = (p: IconProps) => <Icon {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.75" /><path d="m4 18 5.5-5.5 4 4 2.5-2.5L20 18" /></Icon>;
export const WalletIcon = (p: IconProps) => <Icon {...p}><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" /><rect x="4" y="8" width="16" height="11" rx="2" /><circle cx="16" cy="13.5" r="1" /></Icon>;
export const LockIcon = (p: IconProps) => <Icon {...p}><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></Icon>;
export const PauseIcon = (p: IconProps) => <Icon {...p}><path d="M9 6v12M15 6v12" /></Icon>;
export const AlertIcon = (p: IconProps) => <Icon {...p}><path d="M12 4 2.8 19.5h18.4L12 4Z" /><path d="M12 10v4M12 17v.01" /></Icon>;
export const InfoIcon = (p: IconProps) => <Icon {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8v.01" /></Icon>;
export const WrenchIcon = (p: IconProps) => <Icon {...p}><path d="M14.5 6.5a4 4 0 0 0 5 5L13 18a2.1 2.1 0 0 1-3-3l6.5-6.5a4 4 0 0 0-2-2Z" transform="rotate(0)" /><path d="M5 19l3-3" /></Icon>;
export const HomeIcon = (p: IconProps) => <Icon {...p}><path d="M4 11 12 4l8 7" /><path d="M6 9.5V20h12V9.5" /></Icon>;
export const UserIcon = (p: IconProps) => <Icon {...p}><circle cx="12" cy="8" r="4" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></Icon>;
export const SparkIcon = (p: IconProps) => <Icon {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></Icon>;
