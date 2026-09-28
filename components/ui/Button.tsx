export type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "accent"
  | "danger"
  | "ghost";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-[#e41e2b] text-white border-0 font-semibold",
  secondary: "bg-white text-[#3a4658] border border-[#d7dce4]",
  success: "bg-[#fdeced] text-[#b0141f] border border-[#e41e2b] font-semibold",
  accent: "bg-[#fdeced] text-[#a8121c] border border-[#e41e2b] font-semibold",
  danger: "bg-transparent text-[#c2606f] border-0",
  ghost: "bg-transparent text-[#e41e2b] border-0",
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
