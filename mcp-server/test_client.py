"""mcp-server/test_client.py"""

import asyncio
from pathlib import Path

from fastmcp import Client

SERVER_PATH = Path(__file__).resolve().parent / "main.py"


async def main():
    async with Client(SERVER_PATH) as client:

        result = await client.call_tool(
            "search_documents",
            {"query": "Python"}
        )

        print("Search results:")
        print(result.data)


if __name__ == "__main__":
    asyncio.run(main())
