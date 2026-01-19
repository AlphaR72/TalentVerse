const Button = ({
  children,
  onClick,
  variant = "primary",
  className = "",
}) => {
  const base =
    "px-5 py-2 rounded-xl font-medium transition-all duration-200";

  const variants = {
    primary: "bg-primary text-white hover:bg-secondary",
    secondary: "bg-white border border-primary text-primary hover:bg-surface",
    ghost: "text-primary hover:bg-surface",
  };

  return (
    <button
      onClick={onClick}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
