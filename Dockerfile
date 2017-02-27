FROM alpine:3.4

# Install nodejs
RUN apk --no-cache add nodejs curl jq

# Add source
ADD . /forklift-gui

WORKDIR /forklift-gui

# Expose the default node hosting port.
EXPOSE 3000


ENTRYPOINT ["/forklift-gui/bin/start"]

WORKDIR /forklift-gui
RUN npm install