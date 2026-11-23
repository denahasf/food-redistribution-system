import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import { DEFAULT_CENTER } from "../utils/constants";
import { expiryLabel } from "../utils/format";

const foodIcon = new L.DivIcon({
  className: "map-pin food-pin",
  html: "<span>F</span>",
});

const peopleIcon = new L.DivIcon({
  className: "map-pin people-pin",
  html: "<span>P</span>",
});

export default function MapView({ foods, streetTags, center, onMapClick }) {
  return (
    <MapContainer
      center={center || DEFAULT_CENTER}
      zoom={13}
      className="map"
      scrollWheelZoom
      onClick={onMapClick}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {foods.map((food) => (
        <Marker key={food.id} position={[food.latitude, food.longitude]} icon={foodIcon}>
          <Popup>
            <strong>{food.foodName}</strong>
            <br />
            {food.servings} servings · {expiryLabel(food.expiryTime)}
          </Popup>
        </Marker>
      ))}
      {streetTags.map((tag) => (
        <Marker key={tag.id} position={[tag.latitude, tag.longitude]} icon={peopleIcon}>
          <Popup>
            <strong>{tag.numberOfPeople} people need help</strong>
            <br />
            {(tag.conditions || []).join(", ")}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
