# EmptyLess — voiceover script (EN)

`[click]` = press → (next step). Text in square brackets that is not `[click]` is a stage note. In the deck press **N** to see this text.

## 1. Hook — 0:00

Letter mail volumes have dropped by 25% in just two years, yet couriers keep following fixed routes to postboxes, without knowing whether they are empty. Why are we still paying to collect air?

## 2. Problem & risk — 0:15

Latvijas Pasts couriers follow predetermined collection routes across [click] 164 freestanding postboxes. [click] In city traffic, their average speed is only 20 to 25 kilometres per hour, and in rush hour even less. [click] Every stop comes at a cost. Fuel is about €2 per litre. Courier labour is €11.87 per hour. And every litre burned produces about 2.7 kilograms of CO₂. The real problem is that Latvijas Pasts has no tools to know whether a postbox actually needs collecting. As letter volumes fall, this becomes harder to justify. [click] In 2025, Latvijas Pasts planned to remove 112 postboxes and removed 83. If costs keep growing, more will follow, and elderly residents and smaller communities lose access to essential postal services. We believe there is a better way to keep postal accessibility while reducing operational waste.

## 3. Solution — 1:10

[Live demonstration: installing the EmptyLess sensor module inside a postbox.] Meet EmptyLess: an affordable, modular IoT solution that turns existing postboxes into intelligent, connected infrastructure. [click] Instead of replacing postboxes, we upgrade what is already there. Our sensor kit costs about €65 in components. It monitors the fill level of each postbox and sends the data to our central analytics platform. When a postbox reaches 80% capacity, the system flags it for collection and optimises the courier route. [click] Our key advantage is retrofit. No new postboxes, no new vehicles, no rebuilt courier software. The module installs quickly, and couriers keep using familiar navigation. [PROTOTYPE TEXT — to be added by the prototype team]

## 4. Live demo — 1:48

Let us show you how it works. On the left, a conventional route: ten postboxes and about 45 minutes of driving and collecting, whether they contain mail or not. On the right, the EmptyLess dashboard. Our sensors show real-time occupancy. In this simulated scenario, only three of ten postboxes have reached the threshold. The system drops the other seven stops and recalculates, and the route is reduced by 60%. That means fewer kilometres, less fuel, fewer unnecessary stops and more productive working hours. [click] Dispatchers see the whole network, [click] and couriers receive optimised routes directly.

## 5. Components — 2:34

[click] The alternative for the ultrasonic sensor was an infrared sensor, which detects an object in a certain set range. However, ultrasonic sensor was chosen since unlike an infrared sensor, which checks if something is or isn't in front of it, the ultrasonic sensor can see exactly what distance the object is from the sensor. That allows the calculation of the fill percentage of the postbox. [click] The weight sensor that was chosen has a limit of 5 kilograms, however, that can be expanded to up to 20 kilograms for the postboxes of other sizes. [click] As for the microcontroller, the Arduino UNO was used for simplified functionality, and for the final product the options were to add an additional module for the Wi-Fi or choose a controller with the inbuilt Wi-Fi capabilities. In the end, ESP32 Wi-Fi microcontroller was chosen for the final product.

## 6. Business model — 3:33

Now, the economics. [click] One module costs about €65 in components, excluding VAT. [click] For 164 freestanding postboxes, the hardware for the whole network is roughly €10,700. That is modernising existing assets, not building new ones. [click] Our model combines hardware and Software as a Service. The customer buys the module and pays a recurring subscription for monitoring, analytics and route optimisation. That means continuous value for the customer and recurring revenue for EmptyLess. [click] Fewer trips, less fuel and fewer unproductive hours point to a fast payback, and the pilot will measure it.

## 7. Team — 4:11

Behind EmptyLess is a multidisciplinary team in engineering, robotics, data science, software development and business analysis. We cover the whole solution, from sensor installation and data collection to backend, interfaces and route optimisation. We know that technology has to fit real operational processes and the people who use it. We are ready to take responsibility for the next stage: integration and pilot testing.

## 8. Pilot — 4:38

We are not asking Latvijas Pasts to upgrade its network tomorrow. We propose one practical step: a pilot with 30 to 50 postboxes across five districts of Riga: Purvciems, Pļavnieki, Imanta, Āgenskalns and Zolitūde. [click] Latvijas Pasts gets sensors in these postboxes, a live dashboard, optimised collection routes, a report on how often the boxes are actually empty, and the savings measured on real routes: kilometres, fuel and courier hours. That gives the evidence to decide whether EmptyLess should be scaled across the national network.

## 9. Vision — 5:08

Postboxes are only the beginning. [click] The same technology can serve waste containers, textile donation points, battery recycling stations and other infrastructure that is serviced on fixed schedules, without real-time information about its actual condition. [click] Let us start with Latvijas Pasts in Riga, and continue to Europe.

## 10. Contact — 5:28

Stop paying to collect air. We are EmptyLess. Thank you. [Hold this slide for a few seconds so the QR code can be scanned.]
