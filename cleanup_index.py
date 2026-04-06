#!/usr/bin/env python3
# -*- coding: utf-8 -*-

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the first closing tag after "salonSlider" 
slider_open = content.find('<div class="salon-slider" id="salonSlider">')
if slider_open < 0:
    print("Could not find salonSlider start")
    exit(1)

# Find the right button 
right_btn = content.find('slider-btn right', slider_open)
if right_btn < 0:
    print("Could not find right button")
    exit(1)

# Find the end of right button tag
right_btn_end = content.find('>', right_btn) + 1

# Find the closing /div of slider-wrapper after the right button
closing_div = content.find('</div>', right_btn_end)
if closing_div < 0:
    print("Could not find closing div")
    exit(1)

# Reconstruct
before = content[:slider_open + len('<div class="salon-slider" id="salonSlider">')]
after_right_btn = content[right_btn_end:]

# Build the new content
new_middle = '''
        <!-- Trending salons will be populated here by JavaScript -->
    </div>

    <button class="slider-btn right" aria-label="Next salons">&#10095;</button>
</div>
    

</section>

    '''

# Find where the after part should start (after the right button and closing divs)
next_section_start = content.find('<div id="locationModal"', closing_div)
if next_section_start < 0:
    print("Could not find locationModal")
    exit(1)

final_after = content[next_section_start:]
final_content = before + new_middle + final_after

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(final_content)

print("Success! index.html cleaned")
