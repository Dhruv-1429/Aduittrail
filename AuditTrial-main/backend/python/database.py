import os
import certifi  # <-- ADDED: This imports the trusted SSL certificates
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load variables from the .env file
load_dotenv()

# Fetch the Atlas connection string
MONGO_ATLAS_URI = os.getenv("MONGO_ATLAS_URI")

if not MONGO_ATLAS_URI:
    print("Warning: No MONGO_ATLAS_URI found in environment variables.")

# Create the async client
# <-- ADDED: tlsCAFile tells Python to use certifi to verify the connection
client = AsyncIOMotorClient(MONGO_ATLAS_URI, tlsCAFile=certifi.where())

# Connect to a specific database in your Atlas cluster
db = client.gateway_db