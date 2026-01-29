use super::error::{anyhow, SocketResult};

#[derive(Debug, Default)]
pub struct BinaryWriter {
    buffer: Vec<u8>,
}

#[derive(Debug)]
pub struct BinaryReader<'a> {
    buffer: &'a [u8],
    offset: usize,
}

impl BinaryWriter {
    pub fn new() -> Self {
        Self { buffer: Vec::new() }
    }

    pub fn with_capacity(capacity: usize) -> Self {
        Self {
            buffer: Vec::with_capacity(capacity),
        }
    }

    pub fn write_u8(&mut self, value: u8) {
        self.buffer.push(value);
    }

    pub fn write_i32(&mut self, value: i32) {
        self.buffer.extend_from_slice(&value.to_le_bytes());
    }

    pub fn write_u32(&mut self, value: u32) {
        self.buffer.extend_from_slice(&value.to_le_bytes());
    }

    pub fn write_u32_at(&mut self, offset: usize, value: u32) {
        let bytes = value.to_le_bytes();
        self.buffer[offset..offset + 4].copy_from_slice(&bytes);
    }

    pub fn write_u64(&mut self, value: u64) {
        self.buffer.extend_from_slice(&value.to_le_bytes());
    }

    pub fn write_string(&mut self, value: &str) {
        let bytes = value.as_bytes();
        assert!(
            bytes.len() <= u16::MAX as usize,
            "String too long: {} bytes (max {})",
            bytes.len(),
            u16::MAX
        );

        self.buffer
            .extend_from_slice(&(bytes.len() as u16).to_le_bytes());
        self.buffer.extend_from_slice(bytes);
    }

    pub fn write_bytes(&mut self, bytes: &[u8]) {
        self.buffer.extend_from_slice(bytes);
    }

    pub fn write_bytes_with_length(&mut self, bytes: &[u8]) {
        self.buffer
            .extend_from_slice(&(bytes.len() as u32).to_le_bytes());
        self.buffer.extend_from_slice(bytes);
    }

    pub fn write_bool(&mut self, value: bool) {
        self.buffer.push(if value { 1 } else { 0 });
    }

    pub fn len(&self) -> usize {
        self.buffer.len()
    }

    pub fn is_empty(&self) -> bool {
        self.buffer.is_empty()
    }

    pub fn as_bytes(&self) -> &[u8] {
        &self.buffer
    }

    pub fn into_bytes(self) -> Vec<u8> {
        self.buffer
    }

    pub fn clear(&mut self) {
        self.buffer.clear();
    }
}

impl<'a> BinaryReader<'a> {
    pub fn new(buffer: &'a [u8]) -> Self {
        Self { buffer, offset: 0 }
    }

    pub fn read_u8(&mut self) -> SocketResult<u8> {
        self.check_bounds(1)?;
        let value = self.buffer[self.offset];
        self.offset += 1;
        Ok(value)
    }

    pub fn read_i32(&mut self) -> SocketResult<i32> {
        self.check_bounds(4)?;
        let bytes: [u8; 4] = self.buffer[self.offset..self.offset + 4]
            .try_into()
            .map_err(|_| anyhow!("failed to read i32 at offset {}", self.offset))?;
        self.offset += 4;
        Ok(i32::from_le_bytes(bytes))
    }

    pub fn read_u32(&mut self) -> SocketResult<u32> {
        self.check_bounds(4)?;
        let bytes: [u8; 4] = self.buffer[self.offset..self.offset + 4]
            .try_into()
            .map_err(|_| anyhow!("failed to read u32 at offset {}", self.offset))?;
        self.offset += 4;
        Ok(u32::from_le_bytes(bytes))
    }

    pub fn read_u64(&mut self) -> SocketResult<u64> {
        self.check_bounds(8)?;
        let bytes: [u8; 8] = self.buffer[self.offset..self.offset + 8]
            .try_into()
            .map_err(|_| anyhow!("failed to read u64 at offset {}", self.offset))?;
        self.offset += 8;
        Ok(u64::from_le_bytes(bytes))
    }

    pub fn read_string(&mut self) -> SocketResult<String> {
        self.check_bounds(2)?;
        let len_bytes: [u8; 2] = self.buffer[self.offset..self.offset + 2]
            .try_into()
            .map_err(|_| anyhow!("failed to read string length at offset {}", self.offset))?;
        let length = u16::from_le_bytes(len_bytes) as usize;
        self.offset += 2;

        self.check_bounds(length)?;
        let string = std::str::from_utf8(&self.buffer[self.offset..self.offset + length])
            .map_err(|e| anyhow!("invalid UTF-8 string at offset {}: {}", self.offset, e))?
            .to_string();
        self.offset += length;
        Ok(string)
    }

    pub fn read_bytes_with_length(&mut self) -> SocketResult<Vec<u8>> {
        let length = self.read_u32()? as usize;
        self.check_bounds(length)?;
        let bytes = self.buffer[self.offset..self.offset + length].to_vec();
        self.offset += length;
        Ok(bytes)
    }

    pub fn read_bool(&mut self) -> SocketResult<bool> {
        Ok(self.read_u8()? != 0)
    }

    pub fn remaining_bytes(&self) -> &[u8] {
        &self.buffer[self.offset..]
    }

    pub fn is_empty(&self) -> bool {
        self.offset >= self.buffer.len()
    }

    pub fn remaining_len(&self) -> usize {
        self.buffer.len().saturating_sub(self.offset)
    }

    pub fn offset(&self) -> usize {
        self.offset
    }

    pub fn skip(&mut self, count: usize) -> SocketResult<()> {
        self.check_bounds(count)?;
        self.offset += count;
        Ok(())
    }

    fn check_bounds(&self, needed: usize) -> SocketResult<()> {
        if self.offset + needed > self.buffer.len() {
            Err(anyhow!(
                "buffer underflow at offset {}: need {} bytes, have {} remaining",
                self.offset,
                needed,
                self.buffer.len() - self.offset
            ))
        } else {
            Ok(())
        }
    }
}
