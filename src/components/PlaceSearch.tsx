"use client";

import { useCallback, useId, useState, type SubmitEvent } from "react";
import { MAX_QUERY_LENGTH, MIN_QUERY_LENGTH } from "@/lib/air/contracts";
import { searchPlaces, useApiCall } from "@/lib/client/api";
import { useDeviceLocation } from "@/lib/client/geolocation";
import type { Place } from "@/lib/domain/air";
import type { Coordinates } from "@/lib/domain/geo";
import { useMessages } from "./i18n";
import { Icon } from "./Icon";

export interface PlaceSearchProps {
  onSelect: (place: Place) => void;
}

const placeLabel = (place: Place): string =>
  place.region ? `${place.name}, ${place.region}` : place.name;

/** Find a town by name, or use the device's location, anywhere in India. */
export function PlaceSearch({ onSelect }: Readonly<PlaceSearchProps>) {
  const { where, errors } = useMessages();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const search = useApiCall(searchPlaces);
  const located = useCallback(
    (point: Coordinates) => onSelect({ name: where.yourLocation, region: null, ...point }),
    [onSelect, where.yourLocation],
  );
  const device = useDeviceLocation(located);

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    device.clearProblem();
    const q = query.trim();
    if (q.length >= MIN_QUERY_LENGTH) void search.run({ q });
  }

  function choose(place: Place) {
    search.reset();
    onSelect(place);
  }

  const places = search.data?.places ?? [];
  const noMatch = search.status === "done" && !places.length;
  let status = "";
  if (search.loading) status = where.searching;
  else if (search.error) status = errors[search.error];
  else if (noMatch) status = where.noMatch;

  return (
    <div className="place-search">
      <form role="search" className="search-row" onSubmit={submit}>
        <div className="field grow">
          <label htmlFor={inputId}>{where.town}</label>
          <input
            id={inputId}
            type="search"
            value={query}
            minLength={MIN_QUERY_LENGTH}
            maxLength={MAX_QUERY_LENGTH}
            autoComplete="address-level2"
            placeholder={where.placeholder}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button type="submit" className="button primary" disabled={search.loading}>
          <Icon name="search" />
          {where.search}
        </button>
      </form>
      <button
        type="button"
        className="button secondary"
        onClick={device.locate}
        disabled={device.locating}
      >
        <Icon name="pin" />
        {device.locating ? where.finding : where.useLocation}
      </button>
      <p role="status" className="status">
        {device.problem ? where.location[device.problem] : status}
      </p>
      {places.length > 0 && (
        <ul className="place-results" aria-label={where.matches}>
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
