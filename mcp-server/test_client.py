"""mcp-server/test_client.py"""

import asyncio
from pathlib import Path

from fastmcp import Client

SERVER_PATH = Path(__file__).resolve().parent / "main.py"


async def main():
    async with Client(SERVER_PATH) as client:
        test_files = [
            "test.txt",
            "../main.py",
            "../../server/package.json",
            "missing.txt",
        ]

        for filename in test_files:
            result = await client.call_tool(
                "read_document",
                {"filename": filename}
            )

            print(f"\nFile: {filename}")
            print(f"Result: {result.data}")


if __name__ == "__main__":
    asyncio.run(main())
