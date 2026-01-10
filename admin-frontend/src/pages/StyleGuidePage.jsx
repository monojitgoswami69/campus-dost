import React, { useState } from 'react';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { Badge, StatusBadge } from '../components/UI/Badge';
import { Toggle, Slider, Select, Tooltip } from '../components/UI/FormControls';
import { Modal } from '../components/UI/Modal';
import { Skeleton, CardSkeleton, TableSkeleton } from '../components/UI/Skeleton';
import { EmptyState } from '../components/UI/EmptyState';

export default function StyleGuidePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [toggleValue, setToggleValue] = useState(false);
  const [sliderValue, setSliderValue] = useState(50);
  const [selectValue, setSelectValue] = useState('option1');

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Introduction */}
      <div>
        <h1 className="text-4xl font-bold mb-4">Design System Style Guide</h1>
        <p className="text-lg text-neutral-600">
          A comprehensive guide to the components, tokens, and patterns used in this admin dashboard.
        </p>
      </div>

      {/* Color Palette */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Color Palette</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Primary', color: 'bg-primary-600', hex: '#0B5FFF' },
            { name: 'Accent', color: 'bg-accent', hex: '#10B981' },
            { name: 'Success', color: 'bg-success', hex: '#16A34A' },
            { name: 'Warning', color: 'bg-warning', hex: '#F59E0B' },
            { name: 'Danger', color: 'bg-danger', hex: '#EF4444' },
            { name: 'Neutral 900', color: 'bg-neutral-900', hex: '#0F1724' },
            { name: 'Neutral 500', color: 'bg-neutral-500', hex: '#6B7280' },
            { name: 'Background', color: 'bg-background', hex: '#F8FAFC' }
          ].map((item) => (
            <div key={item.name} className="space-y-2">
              <div className={`${item.color} h-20 rounded-lg shadow-card`} />
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-neutral-500">{item.hex}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Typography</h2>
        <div className="space-y-4 bg-surface p-6 rounded-lg shadow-card">
          <div>
            <h1>Heading 1 - 32px/48px/700</h1>
            <code className="text-sm text-neutral-500">text-h1</code>
          </div>
          <div>
            <h2>Heading 2 - 24px/36px/600</h2>
            <code className="text-sm text-neutral-500">text-h2</code>
          </div>
          <div>
            <h3>Heading 3 - 18px/28px/600</h3>
            <code className="text-sm text-neutral-500">text-h3</code>
          </div>
          <div>
            <p className="text-body-lg">Body Large - 16px/24px/400</p>
            <code className="text-sm text-neutral-500">text-body-lg</code>
          </div>
          <div>
            <p className="text-body">Body - 14px/20px/400</p>
            <code className="text-sm text-neutral-500">text-body</code>
          </div>
          <div>
            <p className="text-caption">Caption - 12px/16px/500</p>
            <code className="text-sm text-neutral-500">text-caption</code>
          </div>
        </div>
      </section>

      {/* Buttons */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Buttons</h2>
        <div className="bg-surface p-6 rounded-lg shadow-card space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Variants</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary Button</Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="danger">Danger Button</Button>
              <Button variant="primary" disabled>Disabled</Button>
              <Button variant="primary" loading>Loading</Button>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3">Sizes</h3>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="small">Small</Button>
              <Button size="medium">Medium</Button>
              <Button size="large">Large</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Form Controls */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Form Controls</h2>
        <div className="bg-surface p-6 rounded-lg shadow-card space-y-6">
          <Input label="Text Input" placeholder="Enter text..." />
          <Input label="With Error" error="This field is required" />
          <Input label="With Helper Text" helperText="This is helper text" />
          
          <Toggle
            label="Toggle Switch"
            checked={toggleValue}
            onChange={setToggleValue}
          />
          
          <Slider
            label="Slider Control"
            value={sliderValue}
            onChange={setSliderValue}
            markers={['Low', 'Medium', 'High']}
          />
          
          <Select
            label="Select Dropdown"
            options={[
              { value: 'option1', label: 'Option 1' },
              { value: 'option2', label: 'Option 2' },
              { value: 'option3', label: 'Option 3' }
            ]}
            value={selectValue}
            onChange={setSelectValue}
          />
        </div>
      </section>

      {/* Badges */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Badges</h2>
        <div className="bg-surface p-6 rounded-lg shadow-card">
          <div className="flex flex-wrap gap-3">
            <Badge variant="default">Default</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
            <StatusBadge status="embedded" />
            <StatusBadge status="pending" />
            <StatusBadge status="error" />
          </div>
        </div>
      </section>

      {/* Modal */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Modal</h2>
        <div className="bg-surface p-6 rounded-lg shadow-card">
          <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
          <Modal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Example Modal"
            footer={
              <>
                <Button variant="ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setModalOpen(false)}>Confirm</Button>
              </>
            }
          >
            <p>This is an example modal with a title, content, and footer actions.</p>
          </Modal>
        </div>
      </section>

      {/* Skeletons */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Loading States</h2>
        <div className="bg-surface p-6 rounded-lg shadow-card space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Skeleton Loaders</h3>
            <div className="space-y-4">
              <Skeleton />
              <Skeleton variant="text" />
              <Skeleton variant="circle" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3">Card Skeleton</h3>
            <CardSkeleton />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3">Table Skeleton</h3>
            <TableSkeleton rows={3} cols={4} />
          </div>
        </div>
      </section>

      {/* Empty State */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Empty State</h2>
        <div className="bg-surface p-6 rounded-lg shadow-card">
          <EmptyState
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            }
            title="No items found"
            description="Get started by creating your first item."
            action={<Button>Create Item</Button>}
          />
        </div>
      </section>

      {/* Spacing Scale */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Spacing Scale (8-point)</h2>
        <div className="bg-surface p-6 rounded-lg shadow-card space-y-3">
          {[
            { name: '1', value: '4px' },
            { name: '2', value: '8px' },
            { name: '3', value: '12px' },
            { name: '4', value: '16px' },
            { name: '6', value: '24px' },
            { name: '8', value: '32px' },
            { name: '12', value: '48px' },
            { name: '16', value: '64px' }
          ].map((item) => (
            <div key={item.name} className="flex items-center gap-4">
              <code className="text-sm font-mono w-20">spacing-{item.name}</code>
              <div className="bg-primary-600 h-4" style={{ width: item.value }} />
              <span className="text-sm text-neutral-500">{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Design Tokens Reference */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Design Tokens</h2>
        <div className="bg-surface p-6 rounded-lg shadow-card">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Border Radius</h3>
              <ul className="space-y-2 text-sm">
                <li><code>rounded-sm</code>: 6px</li>
                <li><code>rounded</code>: 12px</li>
                <li><code>rounded-lg</code>: 16px</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Shadows</h3>
              <ul className="space-y-2 text-sm">
                <li><code>shadow-card</code>: 0 6px 18px rgba(16,24,40,0.06)</li>
                <li><code>shadow-elevated</code>: 0 10px 30px rgba(16,24,40,0.08)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Transition Duration</h3>
              <ul className="space-y-2 text-sm">
                <li><code>duration-fast</code>: 120ms</li>
                <li><code>duration-medium</code>: 240ms</li>
                <li><code>duration-slow</code>: 360ms</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Easing</h3>
              <ul className="space-y-2 text-sm">
                <li><code>transition-smooth</code>: cubic-bezier(0.2, 0.8, 0.2, 1)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
