import { Clock, MapPin, Phone, Salad, Soup } from "lucide-react";
import { expiryLabel, formatDateTime } from "../utils/format";

export default function FoodCard({ food, onClaim, distance }) {
  return (
    <article className="food-card">
      {food.imageUrl ? <img src={food.imageUrl} alt={food.foodName} /> : <div className="food-image"><Soup size={32} /></div>}
      <div className="food-body">
        <div className="food-head">
          <div>
            <h3>{food.foodName}</h3>
            <p>{food.category}</p>
          </div>
          <span className={food.isVegetarian ? "veg badge" : "badge"}><Salad size={14} />{food.isVegetarian ? "Veg" : "Mixed"}</span>
        </div>
        <p className="description">{food.description || "Fresh food available for pickup."}</p>
        <div className="meta-grid">
          <span>{food.quantity} {food.unit}</span>
          <span>{food.servings} servings</span>
          <span><Clock size={14} />{expiryLabel(food.expiryTime)}</span>
          {distance != null && <span><MapPin size={14} />{distance.toFixed(1)} km</span>}
        </div>
        <div className="tag-row">
          {(food.tags || []).slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
        </div>
        <footer>
          <small>{food.address || "Pickup location pinned"} · expires {formatDateTime(food.expiryTime)}</small>
          <button className="secondary-button" onClick={() => onClaim(food)}><Phone size={16} />Claim</button>
        </footer>
      </div>
    </article>
  );
}
