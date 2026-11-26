# Glossary

The words Jauge uses, in the code, in the interface and in the documentation. Jauge is an open-source web app that shows where to buy gas near you in Quebec, using the prices stations must publish with the Régie de l'énergie.

Use the word in bold. The words after _Avoid_ mean the same thing and are not used.

## Stations and prices

**Régie**:
The Régie de l'énergie, the Quebec agency that receives the prices each Station reports and publishes them. The app only relays what the Régie publishes.
_Avoid_: Revenu Québec, the government, the API

**Station**:
A gas station listed by the Régie, with its brand, address and the prices it currently posts.
_Avoid_: Gas bar, pump, outlet

**Fuel type**:
One of the three grades the Régie lists: Regular (Régulier), Super and Diesel. The person picks one, and every comparison uses only that grade.
_Avoid_: Grade, octane, product

**Posted price**:
What a Station currently charges for one litre of a Fuel type, in cents, as reported to the Régie.
_Avoid_: Pump price, current price, rate

**Price discrepancy**:
A difference between a Station's Posted price and what it actually charges at the pump, usually because the Station has not updated its price with the Régie.
_Avoid_: Wrong price, app error, bug

**Stale price**:
A Posted price that has not changed for 3 days or more, which usually means the Station stopped updating it with the Régie.
_Avoid_: Old price, outdated price, frozen price

**Price change**:
The moment a Station's Posted price for a Fuel type becomes a different number. A Station can have several in one day.
_Avoid_: Update, tick

**Price history**:
Every Price change recorded for a Station, starting from the day this app began collecting them. Between two changes the price is flat.
_Avoid_: Trend, archive

## Savings

**Fill volume**:
How many litres the person plans to buy on this stop. It defaults to 50 L and the person can change it.
_Avoid_: Tank size, tank capacity

**Fuel consumption**:
How much fuel the person's vehicle uses, in litres per 100 km. It defaults to 8 L/100 km and the person can change it.
_Avoid_: Mileage, efficiency, MPG

**Search radius**:
How far around the person the app looks for Stations to rank. It defaults to 10 km, widens to 25 km when fewer than 5 Stations are found, and the person can change it.
_Avoid_: Range, zone, area

**Reference station**:
The Station every other one is compared against: the one the person would have gone to anyway. By default it is the closest Station that sells the chosen Fuel type; the person can pick another. Shown as "Ta référence".
_Avoid_: Baseline station, default station, nearest

**Detour cost**:
What the extra driving to reach a Station costs, compared with going to the Reference station, counting the trip there and back.
_Avoid_: Travel cost, driving cost

**Real savings**:
The money saved on the Fill volume at a Station's Posted price, compared with the Reference station, minus the Detour cost. It can be zero or negative.
_Avoid_: Savings, discount, net saving

**Best fill-up**:
The Station with the highest Real savings in the Search radius. Shown as "Le meilleur plein"; it is the one thing drawn in the accent colour.
_Avoid_: Best deal, cheapest, winner

**Selected station**:
The Station whose card is in front and which the map is showing. Selecting a Station does not change the Reference station.
_Avoid_: Chosen station, favourite, target

**Better option**:
On a Reference station the person picked: the Best fill-up, when it saves at least $0.50 more. Shown as "meilleure option".
_Avoid_: Recommendation, suggestion

## Where the person is looking

**Position**:
Where the person actually is, as given by their device. Only a Position puts a "you are here" dot on the map.
_Avoid_: Location, GPS, current place

**Place**:
A town, neighbourhood or spot on the map the person chose to look at by hand. A Place is never treated as a Position.
_Avoid_: Location, city, address

**Overview**:
What the person sees after choosing a Place and before picking a Starting point: the map of the Place with every price, and a list sorted by Posted price. Nothing is ranked by Real savings yet.
_Avoid_: Browse mode, explore

**Starting point**:
Where distances and Detour costs are measured from: the person's Position, or, after choosing a Place, the Station they tapped there (which is then also the Reference station).
_Avoid_: Origin, anchor, home

**Area price**:
The lowest Posted price among the Stations of one neighbourhood, town or administrative region, shown on the map when it is zoomed out.
_Avoid_: Average price, cluster
