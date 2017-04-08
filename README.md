# node-mongo-shortener
URL shortening mongo/node service

A very simple and high performance web service used for link shortening.
Works out of the box on heroku.com platform, just deploy it as a heroku app with active mongodb addon using heroku's github integration.


Default behaviour is to delete every link if it's not used for 1 hour or longer.

Also, protocol prefix (http://) is ommited from the shortened url.

These two settings can be modified using EXPIRE_SECONDS and PREFIX env variables.

Also, MONGODB_URI env variable is used to determine url of the DB.

Shortener's listening port is determened by the env variable PORT.

Env variable CODE_SIZE is used for setting the length of the code for shortened link. Default is 5.


## API
There are only two endpoints:
1) GET HOSTNAME/generate/URL which returns a shortened url (as a string) in a form of HOSTNAME/XXXXX
2) GET HOSTNAME/XXXXX which redirects to the original URL

If nonexisting (or deleted due to expiration) url is requested, a HTTP 404 with message "NOT FOUND" is returned.
