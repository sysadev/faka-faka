# Faka-Faka: Automated Portfolio Generator

Faka-Faka is a web application designed specifically for students at Northwest University, Kano. It automates the process of generating a fully responsive, 11-page personal portfolio website. By simply filling out a form, students receive a complete, ready-to-deploy ZIP file containing their HTML pages and profile assets.

## Core Features

1. Automated Architecture: Generates a complete 11-page website based on user inputs, including specialized pages like a freeCodeCamp certification journey.
2. Dynamic Layout Engine: Randomly selects from five major CSS frameworks (Bootstrap 5, Bulma, Tailwind, Materialize, UIKit) and varying navigation structures (Top Navbar, Left Sidebar, Floating Navigation) to ensure no two student portfolios look exactly alike.
3. Client-Side Packaging: Utilizes JSZip to compile the generated HTML strings and user image uploads into a downloadable archive directly in the browser, reducing server payload.
4. Serverless Backend: Powered by a Cloudflare Worker that securely proxies requests to the AI generation API, ensuring API keys remain hidden from the client.
5. Rate Limiting: Implements Cloudflare KV to restrict generation to 3 portfolios per IP address per day, preventing API abuse.

## Technology Stack

* Frontend: Vanilla JavaScript, HTML5, CSS3
* Client Libraries: JSZip
* Backend: Cloudflare Workers (Serverless)
* Database/Storage: Cloudflare KV (Rate Limiting)
* Content Generation: Google Gemini API

## Local Setup and Testing

To test the frontend locally, you need to bypass the Cloudflare Worker and mock the API response, or run a local Cloudflare Worker development environment.

1. Clone the repository to your local machine.
2. Install the Wrangler CLI tool via npm to simulate the Cloudflare Worker locally.
3. Authenticate Wrangler and set up your local KV namespace and API environment variables.
4. Run the local development server using Wrangler to test the end-to-end generation process.

## Deployment

The frontend consists of static files that can be hosted on any standard web server or GitHub Pages. The backend script located in the `functions/api` directory must be deployed to Cloudflare Workers. Ensure that your Cloudflare environment variables, specifically the API key and KV namespace bindings, are correctly configured in your Cloudflare dashboard before going live.
