/* eslint-disable no-console */
/* istanbul ignore file */
import { app } from './app';

const port = process.env.PORT || 8080;

// Start server
app.listen(port, () => console.log(`Server is listening on port ${port}`));
