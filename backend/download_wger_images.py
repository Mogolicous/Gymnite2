import requests
import json
import os

print("Fetching exercises from wger API...")

exercises_data = []
url = "https://wger.de/api/v2/exerciseinfo/?limit=500"
while url:
    print(f"Fetching {url}")
    resp = requests.get(url)
    if resp.status_code != 200:
        print("Error", resp.status_code)
        break
    data = resp.json()
    exercises_data.extend(data.get("results", []))
    url = data.get("next")

image_map = {}
for ex in exercises_data:
    images = ex.get("images", [])
    if images:
        main_img = next((img for img in images if img.get("is_main")), images[0])
        img_url = main_img.get("image")
        
        # Save by original name
        name = ex.get("name")
        if name:
            image_map[name.lower()] = img_url
            
        # Save by aliases
        for alias in ex.get("aliases", []):
            alias_name = alias.get("alias")
            if alias_name:
                image_map[alias_name.lower()] = img_url
                
        # Save by translations
        for translation in ex.get("translations", []):
            trans_name = translation.get("name")
            if trans_name:
                image_map[trans_name.lower()] = img_url

with open("wger_images.json", "w", encoding="utf-8") as f:
    json.dump(image_map, f, ensure_ascii=False, indent=2)

print(f"Saved {len(image_map)} exercise image mappings to wger_images.json!")
