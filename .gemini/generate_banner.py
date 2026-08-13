import zlib
import struct
import os

def make_png(width, height):
    # A simple pixel-art PNG generator using built-in zlib
    # PNG signature
    png = b'\x89PNG\r\n\x1a\n'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = b'IHDR' + ihdr_data
    ihdr_crc = struct.pack('>I', zlib.crc32(ihdr))
    png += struct.pack('>I', len(ihdr_data)) + ihdr + ihdr_crc
    
    # IDAT chunk
    row_size = width * 3 + 1
    raw_data = bytearray(height * row_size)
    
    for y in range(height):
        raw_data[y * row_size] = 0 # Filter byte (None)
        for x in range(width):
            idx = y * row_size + 1 + x * 3
            
            # Vintage Palette Canvas
            # Border: Petrol (#23413E) -> RGB (35, 65, 62)
            # Background: Cream (#F4E9D8) -> RGB (244, 233, 216)
            # Cassette body: Coffee (#5C3D2E) -> RGB (92, 61, 46)
            # Cassette label: Mustard (#D9A441) -> RGB (217, 164, 65)
            # Cassette holes: Petrol (#23413E) -> RGB (35, 65, 62)
            
            is_border = x < 8 or x >= width - 8 or y < 8 or y >= height - 8
            is_cassette = (100 <= x < 220) and (50 <= y < 130)
            is_label = (120 <= x < 200) and (68 <= y < 112)
            
            # cassette holes
            is_hole = is_label and (
                ((x - 145)**2 + (y - 90)**2 < 64) or 
                ((x - 175)**2 + (y - 90)**2 < 64)
            )
            
            if is_hole:
                # Petrol
                raw_data[idx] = 35
                raw_data[idx+1] = 65
                raw_data[idx+2] = 62
            elif is_label:
                # Mustard
                raw_data[idx] = 217
                raw_data[idx+1] = 164
                raw_data[idx+2] = 65
            elif is_cassette:
                # Coffee
                raw_data[idx] = 92
                raw_data[idx+1] = 61
                raw_data[idx+2] = 46
            elif is_border:
                # Petrol
                raw_data[idx] = 35
                raw_data[idx+1] = 65
                raw_data[idx+2] = 62
            else:
                # Cream
                raw_data[idx] = 244
                raw_data[idx+1] = 233
                raw_data[idx+2] = 216
                
    idat_data = zlib.compress(raw_data)
    idat = b'IDAT' + idat_data
    idat_crc = struct.pack('>I', zlib.crc32(idat))
    png += struct.pack('>I', len(idat_data)) + idat + idat_crc
    
    # IEND chunk
    iend = b'IEND'
    iend_crc = struct.pack('>I', zlib.crc32(iend))
    png += struct.pack('>I', 0) + iend + iend_crc
    
    return png

# Ensure target directory exists
target_dir = r'c:\Users\dcazo\Desktop\vintage player\android\app\src\main\res\drawable'
os.makedirs(target_dir, exist_ok=True)
png_bytes = make_png(320, 180)

# Write output file
output_path = os.path.join(target_dir, 'banner_tv.png')
with open(output_path, 'wb') as f:
    f.write(png_bytes)

print(f"Retro banner successfully written to: {output_path}")
