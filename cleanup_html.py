#!/usr/bin/env python
# -*- coding: utf-8 -*-

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the trending section start and locationModal start
trend_start = content.find('<section class="trending">')
location_start = content.find('<div id="locationModal"')

if trend_start >= 0 and location_start > trend_start:
    # Rebuild the trending section
    before = content[:trend_start]
    after = content[location_start:]
    
    new_section = '''<section class="trending">
    <h3>Trending Salons</h3>
    <div class="salon-slider-wrapper">
        <button class="slider-btn left" aria-label="Previous salons">&#10094;</button>
        <div class="salon-slider" id="salonSlider">
            <!-- Trending salons will be populated here by JavaScript -->
        </div>
        <button class="slider-btn right" aria-label="Next salons">&#10095;</button>
    </div>
</section>

    '''
    
    new_content = before + new_section + after
    
    # Write back
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print('HTML cleaned successfully!')
else:
    print('Could not find sections')
    print(f'trend_start: {trend_start}, location_start: {location_start}')
