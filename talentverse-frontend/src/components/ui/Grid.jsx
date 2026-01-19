const Grid = ({ 
  children, 
  cols = 3, 
  className = "", 
  gap = "gap-6" 
}) => {
  const colClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={`grid ${colClasses[cols]} ${gap} ${className}`}>
      {children}
    </div>
  );
};

export default Grid;