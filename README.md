## Project Setup

1. Clone the repository
2. copy .env.example to .env and you dont need to change anything
3. run `docker compose up -d` to start the containers
4. Navigate to `http://localhost:8081` to access the mongo express admin panel
5. Navigate to `http://localhost:3000/api` to access the swagger documentation

## Things I did

1. Used mongodb as the database
   - used mongoose as the odm
2. simple git workflow
   - used branches by feature like `feature/auth`, `feature/docker`
3. Wrote 2 e2e tests
   - user auth flow e2e test
   - order creation flow e2e test
4. Project specifications
   1. Dockerized the app
   2. Docker-compose file
   3. Environment variables
   4. Swagger documentation
   5. Auth and User module
   6. Carts module
   7. Products module
   8. Orders module

---

## And here is the initial db design

![Initial DB Design](./docs/initial-db-design.png)

---

## And instead of me making you read through the code and you trying to understand what I did for each feature, I will show you the video demo

![Video Demo](./docs/demo-video.mkv)
