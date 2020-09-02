# Semesterticket Apple Wallet Backend

## Introduction
This research project had the goal to explore whether it is possible to transfer the bus and train ticket, issued by DB Regio AG in cooperation with the WWU Münster, into an Apple Wallet pass. In order to achieve this, the backend combines [OCR](https://en.wikipedia.org/wiki/Optical_character_recognition) and [Aztec decoding](https://en.wikipedia.org/wiki/Aztec_Code) in order to transfer the ticket's relevant information into the previously-called Passbook app.

## What this project is not
This software requires the user to have a valid SemesterTicket NRW. It does not enable the generation of illegal tickets which were not officially purchased through Deutsche Bahn or other sales agencies. 

## Does the backend generate valid tickets?
The main purpose of this project was [Proof of Concept](https://de.wikipedia.org/wiki/Proof_of_Concept). The main idea was explicitly *not* to provide a solution that works during a ticket check inside a train or bus. However, the Android app [KCD eTicketinfo 2.0](https://play.google.com/store/apps/details?id=de.ivu.eticketinfo&hl=gsw) reports a valid ticket when scanning the Apple Wallet pass. So in theory, the chances are good that the backend produces control-safe tickets.

## Final notes
All shown logos and trademarks are the intellectual property of their respective owners, namely Deutsche Bahn AG, Verkehrsverbund Rhein-Sieg GmbH or WestfalenTarif GmbH. They are **not** covered by the MIT license, under which the source code is released.