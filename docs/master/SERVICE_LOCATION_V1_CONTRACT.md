# Normalized private installation locations

Human operations `service_location.create`, `service_location.assign`, `service_location.get`, `service_location.list` enter `/api/telecom/locations/v1` through the current cookie JWT and tenant membership. PRODUCT_V1_ENABLED defaults off; Origin and no-store rules apply. Members may create local installation facts and assign them to manual-source nonterminal fiber/fixed voice/data services. Viewer consumes safe location references only.

A location is an immutable customer-bound address record with structured street lines, postal code, city, optional region and two-letter country. Reuse its ID across compatible services. Corrections create a new record. It never copies or infers a fiscal address. Normal DTOs return ID/customer/version/label/country/source only. Precise address fields require `sensitive.get` entity_kind `service_location` and the explicit requested subset of address_line1/address_line2/postal_code/city/region/country; viewer is denied. No raw address enters global search, activity, audit or URLs.

Assignment locks contract then service, checks parent and installation-details CAS, validates exact workspace/customer ancestry and increments both versions. Each assignment/unlink appends an immutable historical event. Existing planning metadata remains intact; service.installation_get exposes only the current location ID. Assignment never activates a service or asserts provider success. Imported/integration service business facts remain read-only.

Create/assign have exact HMAC-bound durable command receipts. A replay retains the original versions after later assignments but must pass current membership authorization. Limits: body4096bytes; pages1..100 UUID keyset; label100/street300+150/postal20/city100/region100 characters. No GIS, provider API, device credentials or production infrastructure.

Implementation is a FINAL7 candidate until exact real disposable Supabase and native independent-process proof completes. New writes remain FUTURE_AI_ACTION_CANDIDATE; reads are candidates only and no AI tools are registered.
