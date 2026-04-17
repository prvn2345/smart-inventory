const StockBadge = ({ status, current, minimum }) => {
  if (status === 'out_of_stock' || current === 0) {
    return <span className="badge-out">Out of Stock</span>;
  }
  if (status === 'low' || current <= minimum) {
    return <span className="badge-low">Low Stock</span>;
  }
  return <span className="badge-ok">In Stock</span>;
};

export default StockBadge;
