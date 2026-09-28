export type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "accent"
  | "danger"
  | "ghost";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-[#d71f28] text-white border-0 font-semibold",
  secondary: "bg-white text-[#3a4658] border border-[#d7dce4]",
  success: "bg-[#eaf6ef] text-[#1b7a48] border border-[#9fd3b5] font-semibold",
  accent: "bg-white text-[#b3161e] border border-[#efb9bc] font-semibold",
  danger: "bg-transparent text-[#c2606f] border-0",
  ghost: "bg-transparent text-[#d71f28] border-0",
};

export function buttonClass(variant: ButtonVariant = "primary", extra = "") {
  return `inline-flex items-center justify-center gap-1.5 rounded-[9px] px-3.5 py-2 text-[13px] cursor-pointer transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASS[variant]} ${extra}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  return <button {...props} className={buttonClass(variant, className)} />;
}
