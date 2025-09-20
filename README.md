# SFC (Serverless Free Calls)

SFC enables users to make calls without registration or a dedicated backend server. The project leverages modern web technologies to provide seamless, peer-to-peer communication directly from the browser.

## Features

- **No Registration Required:** Start calling instantly—no sign-up needed.
- **Serverless Architecture:** No specific backend server; uses decentralized or peer-to-peer technologies.
- **Privacy Focused:** Minimal data handling, no user accounts.
- **Easy Integration:** Simple to embed or use in any web project.
More details of peer-to-peer implementation can be found [here](https://github.com/dmotz/trystero)

## Getting Started

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/sfc.git
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Start the development server:
    ```bash
    npm run start
    ```
4. Create sel signed certificates for local network:
    ```bash
    /bin/bash ./generate-cert.sh
    ```

## Technologies Used

- WebRTC for peer-to-peer - [trystero](https://github.com/dmotz/trystero)
- React for UI

## Contributing

Contributions are welcome! Please open issues or submit pull requests.

## License

[MIT](LICENSE)