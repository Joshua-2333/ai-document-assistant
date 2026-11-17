"""mcp-server/test_client.py"""

import asyncio
from pathlib import Path

from fastmcp import Client

SERVER_PATH = Path(__file__).resolve().parent / "main.py"


async def main():
    async with Client(SERVER_PATH) as client:
        result = await client.call_tool("list_documents", {})

        print("Available documents:")

        for document in result.data:
            print(f"- {document}")


if __name__ == "__main__":
    asyncio.run(main())
