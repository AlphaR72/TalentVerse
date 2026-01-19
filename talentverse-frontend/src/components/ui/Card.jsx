const Card = ({ children, className = "" }) => {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm p-6 border border-slate-200 ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
