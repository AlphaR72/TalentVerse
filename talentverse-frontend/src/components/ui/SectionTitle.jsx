const SectionTitle = ({ title, subtitle }) => {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {subtitle && (
        <p className="text-muted mt-1">{subtitle}</p>
      )}
    </div>
  );
};

export default SectionTitle;
