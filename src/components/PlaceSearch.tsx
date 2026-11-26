"use client";

import { useId, useState, type SubmitEvent } from "react";
import { MAX_QUERY_LENGTH, MIN_QUERY_LENGTH } from "@/lib/air/contracts";
import { searchPlaces, useApiCall } from "@/lib/client/api";
import { useDeviceLocation } from "@/lib/client/geolocation";
import type { Place } from "@/lib/domain/air";
import { Icon } from "./Icon";

export interface PlaceSearchProps {
  onSelect: (place: Place) => void;
}

const placeLabel = (place: Place): string =>
  place.region ? `${place.name}, ${place.region}` : place.name;

/** Find a town by name, or use the device's location, anywhere in India. */
export function PlaceSearch({ onSelect }: PlaceSearchProps) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const search = useApiCall(searchPlaces);
  const device = useDeviceLocation(onSelect);

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    device.clearMessage();
    const q = query.trim();
    if (q.length >= MIN_QUERY_LENGTH) void search.run({ q });
  }

  function choose(place: Place) {
    search.reset();
    onSelect(place);
  }

  const places = search.data?.places ?? [];
  const noMatch = search.status === "done" && !places.length;
  const status = search.loading
    ? "Searching…"
    : (search.error ?? (noMatch ? "No town in India matched that name." : ""));

  return (
    <div className="place-search">
      <form role="search" className="search-row" onSubmit={submit}>
        <div className="field grow">
          <label htmlFor={inputId}>Town or city</label>
          <input
            id={inputId}
            type="search"
            value={query}
            minLength={MIN_QUERY_LENGTH}
            maxLength={MAX_QUERY_LENGTH}
            autoComplete="address-level2"
            placeholder="e.g. Noida, Lucknow, Pune"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button type="submit" className="button primary" disabled={search.loading}>
          <Icon name="search" />
          Search
        </button>
      </form>
      <button
        type="button"
        className="button secondary"
        onClick={device.locate}
        disabled={device.locating}
      >
        <Icon name="pin" />
        {device.locating ? "Finding you…" : "Use my location"}
      </button>
      <p role="status" className="status">
        {device.message ?? status}
      </p>
      {places.length > 0 && (
        <ul className="place-results" aria-label="Matching places">
          {places.map((place) => (
            <li key={`${String(place.latitude)},${String(place.longitude)}`}>
              <button type="button" className="button link" onClick={() => choose(place)}>
                {placeLabel(place)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
