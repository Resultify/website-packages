# Changelog

## [0.4.0](https://github.com/Resultify/website-packages/compare/v0.3.0...v0.4.0) (2026-11-25)


### New

* discount AI design by bands of hours, with a curve under the total ([704b161](https://github.com/Resultify/website-packages/commit/704b161bb758166e8da7047643c33e77afc796f4))
* show AI discount as a legend line that opens to its curve on click ([a330d7c](https://github.com/Resultify/website-packages/commit/a330d7c9f50a710e201a5f52c19821f441e01f8c))


### Fixed

* never show an AI discount that takes hours off as 0% ([bc0ad3a](https://github.com/Resultify/website-packages/commit/bc0ad3a276cc5786bbbe82f055e747583b1c99dc))

## 0.3.0 (2026-11-23)

### New

- AI generated design takes a share off the total, by package: 20% with Essential, 25% with Growth and 30% with Platform. The total shows the hours before it struck through, and Copy hours and the Hours breakdown list it on a line of its own.
- Read more, in the note of AI generated, Nimbly and Custom: what the design includes, step by step, the feedback rounds and variants that come with it, what more of them cost, and the package it needs.
- A calculations page for the team that sets the hours: change an item's hours or package and see what it does to fifteen example estimates, before and after, with AI generated, Nimbly and Custom design. Share the changes as a link, or download them as a file that opens in Google Sheets. What is still in development is shown locked.

### Changed

- Every design includes 3 feedback rounds, and AI generated 5 variants. Extra feedback and Extra variants count only the ones added on top, from 0.
- New hours for most items: less build time, most of all with AI generated design and in the Product catalogue, and 2h of design for Setup and launch with AI generated and Nimbly. The starting estimate is now 40h with AI generated (was 66h), 75h with Nimbly (was 79h) and 125h with Custom (was 137h).

## 0.2.0 (2026-11-19)

### New

- A new layout: the total, the package and the HubSpot tier on the left, then Design and the site basics, the features in the estimate, and a shelf of everything that can be added, grouped by the package it needs.
- Four designs to choose from: AI generated, Nimbly, Custom and None, each with its own hours, feedback rounds and, for AI generated, variants.
- Project hours apart: the kick-off, training and project management, which is 15% of the design, build and content hours. With no design, it also counts half the design hours Custom would have, since the client's design still has to be checked and built from.
- Several blogs, with a counter for the list and post templates and for Recent blog posts when blogs have designs of their own.
- The Product catalogue, with its complexity (Module based, Dynamic pages or Custom), Favorite products and Related products.
- Custom forms counted form by form; Custom integration with its build and design hours entered.
- The Pro and Ent badges follow the option or quantity chosen.
- An item's total is labelled, apart from its parts' hours, and Design comes before Build everywhere.
- Shorter links to share.
- Coming soon, shown locked on the shelf: Memberships, Forms with external data, CRM Object and Custom Object sections, and CRM Object or Custom Object as the catalogue's source.

## 0.1.0 (2026-10-27)

### New

- The first estimator: a package, the site basics and extra features, with design and build hours.
- Copy hours and the hours breakdown, as text for a quote.
- Published on the web.
