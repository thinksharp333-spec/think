#!/bin/bash

# Target time
TARGET_TIME="04:40"

# Wait until target time
while [ "$(date +%H:%M)" != "$TARGET_TIME" ]; do
    sleep 30
done

# Absolute path to claude binary found earlier
CLAUDE_BIN="/Users/iamgroot/.vscode/extensions/anthropic.claude-code-2.1.101-darwin-arm64/resources/native-binary/claude"

# The three prompts
PROMPT1="In the admin panel , i want data to be retived from a X date to Y date , the data should be of the total number of books read by all the students , and also of the individual students and also according to the current views like schools, taluka ,sidtrict , etc 
the data should be availabe in the excel , pdf format , also that of newly added childredn should also be  generated , there should be a count of newly added children from X date to Y date .
The UI of the admin panel shouled be preofessional and minimilist differen fromt the rest of the site"

PROMPT2="IN the leaderboard add a section of the books read by students , also esach book should be counted only once  and the book should be flaged as completed at the last third page"

PROMPT3="When a book is uploaded by the admin , a quize should be generated based on the book and stored witht he book, it should be availabe offline and downloade able wiht the book , the student should be avle to attend the quize offline also and when network comes the quize score along with the preogress should be synced to the server"

# Execute Claude with the skip permissions flag and pipe the prompts
# We use a slight delay between prompts to simulate human input if needed, 
# although Claude usually handles sequential input well.
{
    echo "$PROMPT1"
    echo "$PROMPT2"
    echo "$PROMPT3"
} | $CLAUDE_BIN --dangerously-skip-permissions
