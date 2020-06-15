# Lambda Terminal

This is an experiment into building a long-running _interactive_ AWS Lambda.

The typical developer experience around Lambda is not unlike that of a blind watchmaker, where you
can carefully mull over the initial starting conditions, but once you start it running, you have no
visibility into what's happening, at least until the Lambda is finished running.

This is all possible because of API Gateway 2.0's new Serverless Websocket support. When the user
first loads the web interface, it connects to a Websocket end point and determines the user's own
connection ID string.

The web interface then invokes a long-running Lambda, passing in the user's connection ID string as
part of the payload. This allows the Lambda to stream messages _to_ the user during its execution.
However, this doesn't give the Lambda the ability to receive messages _from_ the user.

To do that, we pull the same trick that we did in the web interface, and programmatically connect to
a websocket endpoint and figure out our connection ID. We then send that connection ID to the user
through the first channel that we had opened up and start listening for instructions.
