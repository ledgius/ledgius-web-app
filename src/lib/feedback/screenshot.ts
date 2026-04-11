/**
 * Captures a compressed screenshot of the current page.
 * Returns a base64-encoded JPEG string (compressed, not high DPI).
 *
 * Uses modern-screenshot instead of html2canvas because html2canvas cannot
 * handle oklch() colour functions used by Tailwind CSS v4.
 */
export async function captureScreenshot(): Promise<string | null> {
  try {
    const { domToJpeg } = await import("modern-screenshot")
    const data = await domToJpeg(document.body, {
      scale: 1,
      quality: 0.6,
      backgroundColor: "#ffffff",
    })
    if (!data || data === "data:,") {
      console.warn("Screenshot capture returned empty data")
      return null
    }
    return data
  } catch (err) {
    console.warn("Screenshot capture failed:", err)
    return null
  }
}
