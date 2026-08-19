import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from agent.orchestrator import handle_user_message


def main() -> None:
    print("San Guo AI Travel Agent")
    print("输入问题，或输入 exit 退出。")
    while True:
        try:
            message = input("> ").strip()
        except EOFError:
            break
        if message.lower() in {"exit", "quit"}:
            break
        print(handle_user_message(message))


if __name__ == "__main__":
    main()
