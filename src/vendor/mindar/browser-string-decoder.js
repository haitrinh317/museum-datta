export class StringDecoder {
  constructor(encoding = 'utf-8') {
    this.decoder = new TextDecoder(encoding);
  }

  write(value) {
    return this.decoder.decode(value, { stream: true });
  }

  end(value) {
    return this.decoder.decode(value);
  }
}

export default Object.freeze({ StringDecoder });
