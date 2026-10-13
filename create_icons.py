import zlib
import struct
import os

def make_png(width, height, draw_func):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # Filter type 0 (None)
        for x in range(width):
            r, g, b, a = draw_func(x, y, width, height)
            raw_data.extend([r, g, b, a])
    
    compressed = zlib.compress(bytes(raw_data), 9)
    
    def chunk(tag, data):
        c = tag + data
        crc = zlib.crc32(c) & 0xffffffff
        return struct.pack('>I', len(data)) + c + struct.pack('>I', crc)
    
    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    idat = chunk(b'IDAT', compressed)
    iend = chunk(b'IEND', b'')
    return header + ihdr + idat + iend

def draw_emergency_icon(x, y, w, h):
    # Normalized coords from -1 to 1
    nx = (x / w) * 2.0 - 1.0
    ny = (y / h) * 2.0 - 1.0
    dist = (nx**2 + ny**2)**0.5
    
    # Background rounded rect
    corner_radius = 0.82
    if abs(nx) > corner_radius and abs(ny) > corner_radius:
        dx = abs(nx) - corner_radius
        dy = abs(ny) - corner_radius
        if (dx**2 + dy**2)**0.5 > (1.0 - corner_radius):
            return 0, 0, 0, 0
    
    # Dark tactical gradient background
    bg_val = int(7 + 12 * (1.0 - ny))
    bg_r = bg_val + 5
    bg_g = bg_val + 8
    bg_b = bg_val + 18

    # Shield outline / shape
    # Shield formula: top flat with slight dip, curve down to point at (0, 0.75)
    in_shield = False
    if ny > -0.65 and ny < 0.7:
        if ny < 0.0:
            width_at_y = 0.6
        else:
            t = (ny - 0.0) / 0.7
            width_at_y = 0.6 * (1.0 - t**1.4)
        
        if abs(nx) <= width_at_y:
            in_shield = True
    
    if in_shield:
        # Cross in shield
        is_cross = False
        cross_w = 0.14
        cross_h = 0.44
        if abs(nx) < cross_w and abs(ny + 0.05) < cross_h:
            is_cross = True
        if abs(ny + 0.05) < cross_w and abs(nx) < cross_h:
            is_cross = True
        
        if is_cross:
            # White emergency cross with subtle glow
            return 255, 255, 255, 255
        else:
            # Red emergency badge shield gradient
            red_intensity = int(220 + 35 * (1.0 - ny))
            return min(255, red_intensity), 42, 70, 255
            
    # Cyan outer ring glow
    if 0.82 < dist < 0.88:
        return 0, 210, 255, 200
        
    return bg_r, bg_g, bg_b, 255

os.makedirs('icons', exist_ok=True)

with open('icons/icon-192.png', 'wb') as f:
    f.write(make_png(192, 192, draw_emergency_icon))
print('Created icons/icon-192.png')

with open('icons/icon-512.png', 'wb') as f:
    f.write(make_png(512, 512, draw_emergency_icon))
print('Created icons/icon-512.png')
