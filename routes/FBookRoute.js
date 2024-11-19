const express = require('express');
const fetch = require('node-fetch'); // Required for making HTTP requests

const Router = express.Router(); // Initialize the Router

// App ID and Secret from Facebook Developer Console
const appId = '432104696419805';
const appSecret = '7797d1c4a559d93670c4bd57db5f5354';
const redirectUri = 'https://e-commerace-store.onrender.com/facebook/callback';

// Route for Facebook OAuth Callback
Router.get('/facebook/callback', async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send('Authorization code missing');
  }

  try {
    // Get Access Token
    const tokenUrl = `https://graph.facebook.com/v12.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&client_secret=${appSecret}&code=${code}`;

    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error('Failed to retrieve access token');
    }

    const accessToken = tokenData.access_token;

    // Get User Profile
    const profileUrl = `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`;
    const profileResponse = await fetch(profileUrl);
    const profileData = await profileResponse.json();

    // Send profile data as response (or handle it as needed)
    res.json({
      success: true,
      user: profileData,
    });
  } catch (error) {
    console.error('Error during Facebook OAuth:', error);
    res.status(500).send('An error occurred during Facebook login');
  }
});

module.exports = Router; // Export the Router
