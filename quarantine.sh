#!/bin/bash
# Script to quarantine unused files/folders in Zoeflorist project

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QUARANTINE_DIR="$ROOT_DIR/quarantine_backup"

if [ ! -d "$QUARANTINE_DIR" ]; then
    mkdir -p "$QUARANTINE_DIR"
    echo -e "\e[32mCreated quarantine directory at: $QUARANTINE_DIR\e[0m"
fi

# List of folders/files to quarantine (relative paths to root)
ITEMS_TO_QUARANTINE=(
    "stitch_zoeflorist_e_commerce_platform"
    "public/next.svg"
    "public/vercel.svg"
    "public/globe.svg"
    "public/window.svg"
    "public/file.svg"
)

for item in "${ITEMS_TO_QUARANTINE[@]}"; do
    source_path="$ROOT_DIR/$item"
    if [ -e "$source_path" ]; then
        dest_path="$QUARANTINE_DIR/$item"
        
        # Check if parent dir of destination exists
        dest_parent=$(dirname "$dest_path")
        if [ ! -d "$dest_parent" ]; then
            mkdir -p "$dest_parent"
        fi

        # Move the item to quarantine
        mv "$source_path" "$dest_path"
        echo -e "\e[33mSuccessfully quarantined: $item -> quarantine_backup/$item\e[0m"
    else
        echo -e "\e[90mSkipped (not found): $item\e[0m"
    fi
done

echo -e "\n\e[32mQuarantine process completed!\e[0m"
echo -e "\e[36mPlease test your website by running 'npm run build' or 'npm run dev'.\e[0m"
echo -e "\e[36mIf the website works normally, you can permanently delete the 'quarantine_backup' folder.\e[0m"
