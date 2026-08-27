import os
import sys

def generate_icons(output_dir=None):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(script_dir)
    svg_path = os.path.join(root_dir, "projects/app/assets/icon.svg")
    output_dir = os.path.abspath(output_dir) if output_dir else os.path.join(root_dir, "projects/app/icons")

    if not os.path.exists(svg_path):
        print(f"Error: {svg_path} not found.")
        return False

    with open(svg_path, "r", encoding="utf-8") as f:
        svg_content = f.read()

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Error: playwright not found. Please install it with 'pip install playwright' and 'python -m playwright install chromium'.")
        return False

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    try:
        with sync_playwright() as p:
            try:
                browser = p.chromium.launch()
            except Exception as e:
                print(f"Error launching Chromium: {e}")
                print("Please run 'python -m playwright install chromium' before generating icons.")
                return False

            with browser:
                page = browser.new_page(viewport={"width": 512, "height": 512})
                html_content = f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {{ margin: 0; padding: 0; overflow: hidden; background: transparent; }}
                        svg {{ width: 100%; height: 100%; display: block; }}
                    </style>
                </head>
                <body>
                    {svg_content}
                </body>
                </html>
                """
                page.set_content(html_content)

                for size in [16, 32, 48, 128]:
                    out = os.path.join(output_dir, f"icon{size}.png")
                    page.set_viewport_size({"width": size, "height": size})
                    page.wait_for_timeout(100)
                    page.screenshot(path=out, omit_background=True)
                    print(f"Generated {out}")
    except Exception as e:
        print(f"Error during icon generation: {e}")
        return False

    return True

if __name__ == "__main__":
    if not generate_icons(sys.argv[1] if len(sys.argv) > 1 else None):
        sys.exit(1)
