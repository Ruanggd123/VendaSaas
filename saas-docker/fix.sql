UPDATE tenants SET settings = REPLACE(settings, '"openai_api_key":"1234"', '"openai_api_key":""') WHERE id = 'aeeadf53-8f3d-4694-81bc-d171a8e33f1d';
