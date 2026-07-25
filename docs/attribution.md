# Attribution

Offchain attribution is implemented with a direct `<meta name="base:app_id" />` tag in `app/layout.tsx`.

Configured Base app id:

`6a641dd4281b6db318994b3a`

Onchain attribution is passed with `dataSuffix` in every contract write call. Set `NEXT_PUBLIC_DATA_SUFFIX` before production attribution verification.
