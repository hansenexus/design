# Vendored workflow policy

`workflow_policy.py` and `zizmor.yml` are copies of
`hansenexus/hn-infra/.github/actions/workflow-policy/` at tag `workflow-policy-v1`
(`f72490443fd464b0366dc21ca4356d86fba04859`), unchanged.

Why a copy: this repo is public and hn-infra is private. GitHub does not let a public
repository call a reusable workflow or action from a private one, so the `workflow-policy`
job in `ci.yml` runs these files inline instead of
`hansenexus/hn-infra/.github/workflows/workflow-policy.yml@workflow-policy-v1`.

To update: copy both files again from the new tag, bump the sha above, and keep the
zizmor version in `ci.yml` equal to the one in hn-infra's `action.yml`.
