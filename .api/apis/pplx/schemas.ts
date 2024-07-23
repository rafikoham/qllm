const PostChatCompletions = {"body":{"title":"ChatCompletionsRequest","required":["model","messages"],"type":"object","properties":{"model":{"title":"Model","type":"string","description":"The name of the model that will complete your prompt. Possible values include `llama-3-sonar-small-32k-chat`, `llama-3-sonar-small-32k-online`, `llama-3-sonar-large-32k-chat`, `llama-3-sonar-large-32k-online`, `llama-3-8b-instruct`, `llama-3-70b-instruct`, and `mixtral-8x7b-instruct`.\n\nDefault: `llama-3-sonar-small-32k-online`","enum":["llama-3-sonar-small-32k-chat","llama-3-sonar-small-32k-online","llama-3-sonar-large-32k-chat","llama-3-sonar-large-32k-online","llama-3-8b-instruct","llama-3-70b-instruct","mixtral-8x7b-instruct"],"default":"llama-3-sonar-small-32k-online"},"messages":{"title":"Messages","type":"array","description":"A list of messages comprising the conversation so far.","items":{"title":"Message","type":"object","required":["content","role"],"properties":{"content":{"title":"Message Content","type":"string","description":"The contents of the message in this turn of conversation."},"role":{"title":"Role","type":"string","description":"The role of the speaker in this turn of conversation. After the (optional) system message, user and assistant roles should alternate with `user` then `assistant`, ending in `user`.","enum":["system","user","assistant"]}}},"default":[{"role":"system","content":"Be precise and concise."},{"role":"user","content":"How many stars are there in our galaxy?"}]},"max_tokens":{"title":"Max Tokens","type":"integer","description":"The maximum number of completion tokens returned by the API. The total number of tokens requested in max_tokens plus the number of prompt tokens sent in messages must not exceed the context window token limit of model requested. If left unspecified, then the model will generate tokens until either it reaches its stop token or the end of its context window."},"temperature":{"title":"Temperature","type":"number","default":0.2,"description":"The amount of randomness in the response, valued between 0 inclusive and 2 exclusive. Higher values are more random, and lower values are more deterministic.","minimum":0,"maximum":2,"exclusiveMaximum":true},"top_p":{"title":"Top P","type":"number","default":0.9,"description":"The nucleus sampling threshold, valued between 0 and 1 inclusive. For each subsequent token, the model considers the results of the tokens with top_p probability mass. We recommend either altering top_k or top_p, but not both.","minimum":0,"maximum":1},"return_citations":{"title":"Return Citations","type":"boolean","default":false,"description":"Determines whether or not a request to an online model should return citations. Citations are in closed beta access. To gain access, apply at https://perplexity.typeform.com/to/j50rnNiB"},"return_images":{"title":"Return Images","type":"boolean","default":false,"description":"Determines whether or not a request to an online model should return images. Images are in closed beta access. To gain access, apply at https://perplexity.typeform.com/to/j50rnNiB"},"top_k":{"title":"Top K","type":"number","default":0,"description":"The number of tokens to keep for highest top-k filtering, specified as an integer between 0 and 2048 inclusive. If set to 0, top-k filtering is disabled. We recommend either altering top_k or top_p, but not both.","minimum":0,"maximum":2048},"stream":{"title":"Streaming","type":"boolean","default":false,"description":"Determines whether or not to incrementally stream the response with [server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#event_stream_format) with `content-type: text/event-stream`."},"presence_penalty":{"title":"Presence Penalty","type":"number","default":0,"description":"A value between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics. Incompatible with `frequency_penalty`.","minimum":-2,"maximum":2},"frequency_penalty":{"title":"Frequency Penalty","type":"number","default":1,"description":"A multiplicative penalty greater than 0. Values greater than 1.0 penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim. A value of 1.0 means no penalty. Incompatible with `presence_penalty`.","minimum":0,"exclusiveMinimum":true}},"$schema":"http://json-schema.org/draft-04/schema#"},"response":{"200":{"title":"application/json (`stream = false`)","type":"object","properties":{"id":{"title":"Response ID","type":"string","format":"uuid","description":"An ID generated uniquely for each response."},"model":{"title":"Model","type":"string","description":"The model used to generate the response."},"object":{"title":"Object Type","type":"string","description":"The object type, which always equals `chat.completion`."},"created":{"title":"Created Timestamp","type":"integer","description":"The Unix timestamp (in seconds) of when the completion was created."},"choices":{"title":"Choices","type":"array","items":{"title":"Choice","type":"object","properties":{"index":{"type":"integer"},"finish_reason":{"title":"Finish Reason","type":"string","description":"The reason the model stopped generating tokens. Possible values include `stop` if the model hit a natural stopping point, or `length` if the maximum number of tokens specified in the request was reached.\n\n`stop` `length`","enum":["stop","length"]},"message":{"title":"Message","type":"object","required":["content","role"],"properties":{"content":{"title":"Message Content","type":"string","description":"The contents of the message in this turn of conversation."},"role":{"title":"Role","type":"string","description":"The role of the speaker in this turn of conversation. After the (optional) system message, user and assistant roles should alternate with `user` then `assistant`, ending in `user`.\n\n`system` `user` `assistant`","enum":["system","user","assistant"]}},"description":"The message generated by the model."},"delta":{"title":"Message","type":"object","required":["content","role"],"properties":{"content":{"title":"Message Content","type":"string","description":"The contents of the message in this turn of conversation."},"role":{"title":"Role","type":"string","description":"The role of the speaker in this turn of conversation. After the (optional) system message, user and assistant roles should alternate with `user` then `assistant`, ending in `user`.\n\n`system` `user` `assistant`","enum":["system","user","assistant"]}},"description":"The incrementally streamed next tokens. Only meaningful when `stream = true`."}}},"description":"The list of completion choices the model generated for the input prompt."},"usage":{"title":"Usage Statistics","description":"Usage statistics for the completion request.","type":"object","properties":{"prompt_tokens":{"title":"Prompt Tokens","description":"The number of tokens provided in the request prompt.","type":"integer"},"completion_tokens":{"title":"Completion Tokens","description":"The number of tokens generated in the response output.","type":"integer"},"total_tokens":{"title":"Total Tokens","description":"The total number of tokens used in the chat completion (prompt + completion).","type":"integer"}}}},"$schema":"http://json-schema.org/draft-04/schema#"},"422":{"title":"HTTPValidationError","type":"object","properties":{"detail":{"title":"Detail","type":"array","items":{"title":"ValidationError","required":["loc","msg","type"],"type":"object","properties":{"loc":{"title":"Location","type":"array","items":{"anyOf":[{"type":"string"},{"type":"integer"}]}},"msg":{"title":"Message","type":"string"},"type":{"title":"Error Type","type":"string"}}}}},"$schema":"http://json-schema.org/draft-04/schema#"}}} as const
;
export { PostChatCompletions }
