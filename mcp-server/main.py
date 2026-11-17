from fastmcp import FastMCP

# Create the MCP server
mcp = FastMCP("AI Document Assistant")


@mcp.tool
def greet(name: str) -> str:
    """Return a greeting to verify that the MCP server works."""
    return f"Hello, {name}! The AI Document Assistant MCP server is working."


if __name__ == "__main__":
    mcp.run()
