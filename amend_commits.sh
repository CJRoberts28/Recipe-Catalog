#!/bin/bash

# Amend commits to change author and committer information

# Define the author and committer
AUTHOR="Chris Jones-Roberts <Gischris28@gmail.com>"

# Amend each commit
GIT_COMMITS=(26e4bc286b9dff48f544d08dc94b3edc3e3ca0f6 e10c8126cced1a52cd76e5553ee90c22454a1235 24d6407672fd63d433845da3751b7e240ebea7a7)

for COMMIT in "${GIT_COMMITS[@]}"; do
    git commit --amend --author="$AUTHOR" --no-edit "$COMMIT"
done
